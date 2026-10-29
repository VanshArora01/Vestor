import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import type { LoginPayload } from "../../../types/api";

export function useLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(payload: LoginPayload) {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(payload);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to sign in"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { submit, error, isSubmitting };
}
