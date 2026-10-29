"""Sync the official NSE EQ-series instrument master into Vestor's assets table.

Run from backend with the configured DATABASE_URL:
    python -m scripts.sync_nse_equity_master
"""

from __future__ import annotations

import csv
import io
import logging
from zipfile import ZipFile
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from sqlalchemy import or_

from app.db.session import SessionLocal
from app.models.invest import Asset

MASTER_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
BSE_MASTER_URL = "https://www.bseindia.com/downloads/Help/file/scrip.zip"
logger = logging.getLogger(__name__)


def fetch_master() -> list[dict[str, str]]:
    request = Request(MASTER_URL, headers={"User-Agent": "Vestor instrument catalog sync/1.0"})
    with urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8-sig")
    result: list[dict[str, str]] = []
    for row in csv.DictReader(io.StringIO(body)):
        symbol = (row.get("SYMBOL") or "").strip().upper()
        series = (row.get(" SERIES") or row.get("SERIES") or "").strip().upper()
        name = (row.get("NAME OF COMPANY") or "").strip()
        isin = (row.get(" ISIN NUMBER") or row.get("ISIN NUMBER") or "").strip().upper()
        if symbol and name and isin and series == "EQ":
            result.append({"symbol": symbol, "name": name, "isin": isin})
    if not result:
        raise RuntimeError("NSE master download contained no EQ-series instruments; no catalog changes were made.")
    return result


def fetch_bse_master() -> list[dict[str, str]]:
    request = Request(BSE_MASTER_URL, headers={"User-Agent": "Mozilla/5.0 Vestor instrument catalog sync/1.0"})
    with urlopen(request, timeout=30) as response:
        archive = ZipFile(io.BytesIO(response.read()))
    filenames = [
        name for name in archive.namelist()
        if name.upper().rsplit("/", 1)[-1].startswith("BSE_EQ_SCRIP_")
        and name.lower().endswith(".csv")
    ]
    if not filenames:
        raise RuntimeError("BSE scrip archive contained no equity security master; no catalog changes were made.")
    with archive.open(filenames[0]) as source:
        reader = csv.DictReader(io.TextIOWrapper(source, encoding="utf-8-sig"))
        result = []
        for row in reader:
            symbol = (row.get("TckrSymb") or "").strip().upper().rstrip("#")
            name = (row.get("FinInstrmNm") or "").strip()
            isin = (row.get("ISIN") or "").strip().upper()
            scrip_code = (row.get("FinInstrmId") or "").strip()
            if (
                row.get("SctyTpFlg") == "EQ"
                and row.get("Sts") == "A"
                and not (row.get("DelFlg") or "").strip()
                and symbol and name and isin and scrip_code
            ):
                result.append({"symbol": symbol, "name": name, "isin": isin, "scrip_code": scrip_code})
    if not result:
        raise RuntimeError("BSE master download contained no active EQ instruments; no catalog changes were made.")
    return result


def sync() -> tuple[int, int]:
    nse_rows = fetch_master()
    bse_rows = fetch_bse_master()
    synced_at = datetime.now(timezone.utc).isoformat()
    db = SessionLocal()
    try:
        assets = db.query(Asset).filter(Asset.asset_type == "stock").all()
        existing_nse = {asset.symbol: asset for asset in assets if asset.exchange == "NSE" and asset.symbol}
        existing_bse = {}
        bse_duplicates = []
        referenced_asset_ids = set()
        from app.models.invest import PortfolioHolding
        from app.models.paper_trading import PaperPosition, PaperWatchlistItem

        for model in (PortfolioHolding, PaperPosition, PaperWatchlistItem):
            referenced_asset_ids.update(
                asset_id for (asset_id,) in db.query(model.asset_id).filter(model.asset_id.isnot(None)).distinct().all()
            )
        for asset in assets:
            if asset.exchange != "BSE":
                continue
            code = (asset.metadata_json or {}).get("bse_scrip_code")
            key = code or f"legacy:{asset.symbol or ''}"
            current = existing_bse.get(key)
            if current is None:
                existing_bse[key] = asset
            elif asset.id in referenced_asset_ids and current.id not in referenced_asset_ids:
                bse_duplicates.append(current.id)
                existing_bse[key] = asset
            else:
                bse_duplicates.append(asset.id)

        logger.info("Applying official NSE master: %s instruments", len(nse_rows))
        _sync_exchange(db, nse_rows, existing_nse, exchange="NSE", source="NSE_EQ", suffix=".NS", synced_at=synced_at)
        logger.info("Applying official BSE master: %s instruments", len(bse_rows))
        _sync_exchange(db, bse_rows, existing_bse, exchange="BSE", source="BSE_EQ", suffix=".BO", synced_at=synced_at)
        if bse_duplicates:
            db.query(Asset).filter(Asset.id.in_(bse_duplicates)).update({Asset.active: False}, synchronize_session=False)
        logger.info("Committing NSE/BSE instrument catalog")
        db.commit()
        return len(nse_rows), len(bse_rows)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _sync_exchange(db, rows, existing, *, exchange: str, source: str, suffix: str, synced_at: str) -> None:
    identifiers = {row["scrip_code"] if exchange == "BSE" else row["symbol"] for row in rows}
    symbols = {row["symbol"] for row in rows}
    updates = []
    inserts = []
    for row in rows:
        # BSE scrip code is the exchange's unique identifier. Symbols and ISINs
        # may repeat across simultaneously listed securities.
        identifier = row["scrip_code"] if exchange == "BSE" else row["symbol"]
        asset = existing.get(identifier)
        if asset is None and exchange == "BSE":
            asset = existing.get(f"legacy:{row['symbol']}")
        metadata = {
            **(asset.metadata_json or {} if asset else {}),
            "instrument_master": source,
        }
        if exchange == "BSE":
            metadata["bse_scrip_code"] = row["scrip_code"]
        if asset is None:
            metadata["instrument_master_synced_at"] = synced_at
            inserts.append(Asset(
                asset_type="stock",
                symbol=row["symbol"],
                exchange=exchange,
                name=row["name"],
                provider_symbol=f"{row['symbol']}{suffix}",
                isin=row["isin"],
                active=True,
                metadata_json=metadata,
            ))
        else:
            changed = any((
                asset.symbol != row["symbol"],
                asset.name != row["name"],
                asset.provider_symbol != f"{row['symbol']}{suffix}",
                asset.isin != row["isin"],
                not asset.active,
                (asset.metadata_json or {}).get("instrument_master") != source,
                exchange == "BSE" and (asset.metadata_json or {}).get("bse_scrip_code") != row["scrip_code"],
            ))
            if not changed:
                continue
            metadata["instrument_master_synced_at"] = synced_at
            updates.append({
                "id": asset.id,
                "symbol": row["symbol"],
                "name": row["name"],
                "provider_symbol": f"{row['symbol']}{suffix}",
                "isin": row["isin"],
                "active": True,
                "metadata_json": metadata,
            })
    batch_size = 500
    for offset in range(0, len(updates), batch_size):
        db.bulk_update_mappings(Asset, updates[offset : offset + batch_size])
    for offset in range(0, len(inserts), batch_size):
        db.bulk_save_objects(inserts[offset : offset + batch_size])
    if existing:
        query = db.query(Asset).filter(
            Asset.asset_type == "stock",
            Asset.exchange == exchange,
            Asset.active.is_(True),
        )
        if exchange == "BSE":
            code_column = Asset.metadata_json["bse_scrip_code"].astext
            query.filter(or_(
                code_column.notin_(identifiers),
                code_column.is_(None) & Asset.symbol.notin_(symbols),
            )).update({Asset.active: False}, synchronize_session=False)
        else:
            query.filter(Asset.symbol.isnot(None), Asset.symbol.notin_(identifiers)).update(
                {Asset.active: False}, synchronize_session=False
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    nse_count, bse_count = sync()
    logger.info("Synchronized %s NSE EQ-series and %s active BSE EQ instruments", nse_count, bse_count)
