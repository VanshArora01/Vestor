import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { PaperCandles, PaperInstrument, PaperRange } from "../../../types/paperTrading";

type CandleSeries = ISeriesApi<"Candlestick">;
type LineChartSeries = ISeriesApi<"Line">;
type VolumeSeries = ISeriesApi<"Histogram">;
type PriceBar = { time: Time; open: number; high: number; low: number; close: number; volume: number };

interface Props {
  data: PaperCandles;
  instrument: PaperInstrument;
  range: PaperRange;
  interval: string;
  style: "candles" | "line";
}

function chartTime(value: string, interval: string): Time {
  const date = new Date(value);
  if (["1d", "1wk", "1mo", "5d"].includes(interval)) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date) as Time;
  }
  return Math.floor(date.getTime() / 1000) as Time;
}

function latestBarTime(timestamp: string, interval: string): Time {
  const date = new Date(timestamp);
  if (["1d", "1wk", "1mo", "5d"].includes(interval)) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date) as Time;
  }
  const secondsPerBar = interval === "1m" ? 60 : interval === "2m" ? 120 : interval === "5m" ? 300 : interval === "15m" ? 900 : interval === "30m" ? 1800 : interval === "90m" ? 5400 : 3600;
  return (Math.floor(date.getTime() / 1000 / secondsPerBar) * secondsPerBar) as Time;
}

export function PaperTradingChart({ data, instrument, range, interval, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<CandleSeries | null>(null);
  const lineRef = useRef<LineChartSeries | null>(null);
  const volumeRef = useRef<VolumeSeries | null>(null);
  const lastBarRef = useRef<PriceBar | null>(null);
  const [hovered, setHovered] = useState<{ time: string; open?: number; high?: number; low?: number; close: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 370,
      layout: {
        background: { type: ColorType.Solid, color: "#FFFFFF" },
        textColor: "#52615A",
        fontFamily: '"DM Sans", system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#EFF3F0" },
        horzLines: { color: "#EFF3F0" },
      },
      crosshair: {
        vertLine: { color: "#829187", labelBackgroundColor: "#26332C" },
        horzLine: { color: "#829187", labelBackgroundColor: "#26332C" },
      },
      rightPriceScale: { borderColor: "#DCE4DF", scaleMargins: { top: 0.08, bottom: 0.25 } },
      timeScale: { borderColor: "#DCE4DF", timeVisible: interval !== "1d", secondsVisible: false, rightOffset: 4 },
      localization: { locale: "en-IN" },
    });
    chartRef.current = chart;

    const volumes: Array<{ time: Time; value: number; color: string }> = [];
    if (style === "candles") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#16A34A",
        downColor: "#DC5D58",
        borderVisible: false,
        wickUpColor: "#16A34A",
        wickDownColor: "#DC5D58",
        priceLineVisible: true,
      });
      const rows = data.candles.map((candle) => ({
        time: chartTime(candle.time, interval),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume ?? 0),
      }));
      series.setData(rows.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
      lastBarRef.current = rows.at(-1) ?? null;
      candleRef.current = series;
      for (const bar of rows) volumes.push({ time: bar.time, value: bar.volume, color: bar.close >= bar.open ? "rgba(22,163,74,0.24)" : "rgba(220,93,88,0.24)" });
    } else {
      const series = chart.addSeries(LineSeries, { color: "#0F766E", lineWidth: 2, priceLineVisible: true });
      const rows = data.candles.map((candle) => ({
        time: chartTime(candle.time, interval),
        value: Number(candle.close),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume ?? 0),
      }));
      series.setData(rows.map(({ time, value }) => ({ time, value })));
      const final = rows.at(-1);
      lastBarRef.current = final ? { time: final.time, open: final.open, high: final.high, low: final.low, close: final.close, volume: final.volume } : null;
      lineRef.current = series;
      for (const bar of rows) volumes.push({ time: bar.time, value: bar.volume, color: bar.close >= bar.open ? "rgba(22,163,74,0.24)" : "rgba(220,93,88,0.24)" });
    }

    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.setData(volumes);
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volumeRef.current = volume;

    const mainSeries = style === "candles" ? candleRef.current : lineRef.current;
    if (mainSeries) {
      chart.subscribeCrosshairMove((param) => {
        if (!param.time) {
          setHovered(null);
          return;
        }
        const point = param.seriesData.get(mainSeries) as { open?: number; high?: number; low?: number; close?: number; value?: number } | undefined;
        const close = point?.close ?? point?.value;
        if (close == null) {
          setHovered(null);
          return;
        }
        setHovered({
          time: typeof param.time === "string" ? param.time : new Date(Number(param.time) * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: interval === "1d" ? undefined : "short" }),
          open: point?.open,
          high: point?.high,
          low: point?.low,
          close,
        });
      });
    }

    chart.timeScale().fitContent();
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) chart.applyOptions({ width });
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      lineRef.current = null;
      volumeRef.current = null;
      lastBarRef.current = null;
    };
  }, [data, interval, range, style]);

  useEffect(() => {
    const priceValue = Number(instrument.price);
    if (!Number.isFinite(priceValue) || priceValue <= 0) return;
    const last = lastBarRef.current;
    if (!last) return;
    const time = latestBarTime(instrument.price_timestamp ?? instrument.fetched_at ?? new Date().toISOString(), interval);
    const sameBar = time === last.time;
    const bar: PriceBar = {
      time,
      open: sameBar ? last.open : priceValue,
      high: Math.max(sameBar ? last.high : priceValue, priceValue),
      low: Math.min(sameBar ? last.low : priceValue, priceValue),
      close: priceValue,
      volume: sameBar ? last.volume : 0,
    };
    lastBarRef.current = bar;
    if (style === "candles") candleRef.current?.update({ time, open: bar.open, high: bar.high, low: bar.low, close: bar.close });
    else lineRef.current?.update({ time, value: priceValue });
    volumeRef.current?.update({ time, value: bar.volume, color: bar.close >= bar.open ? "rgba(22,163,74,0.24)" : "rgba(220,93,88,0.24)" });
  }, [instrument.price, instrument.price_timestamp, instrument.fetched_at, interval, style]);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[370px] w-full" aria-label={`${instrument.name} ${range} ${style} price chart`} />
      {hovered ? (
        <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[10px] tabular-nums text-[#52615A] shadow-sm ring-1 ring-[#DCE4DF]" aria-live="polite">
          <span>{hovered.time}</span>
          {hovered.open != null ? <span>O {hovered.open.toFixed(2)}</span> : null}
          {hovered.high != null ? <span>H {hovered.high.toFixed(2)}</span> : null}
          {hovered.low != null ? <span>L {hovered.low.toFixed(2)}</span> : null}
          <span>C {hovered.close.toFixed(2)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t border-[#EFF3F0] px-3 py-2 text-[10px] text-[#64746A]">
        <span>{data.interval} candles · Volume shown below</span>
        <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer" className="font-medium underline decoration-[#A7B4AB] underline-offset-2 hover:text-[#141C16]">Charts by TradingView</a>
      </div>
    </div>
  );
}
