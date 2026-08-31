"use client";
import { useEffect, useState } from "react";
import { AtsocParameters, DEFAULT_PARAMETERS } from "./atsoc-control";
const KEY = "atsoc-control-parameters-v1";
export function useAtsocParameters() {
  const [parameters, setParameters] =
    useState<AtsocParameters>(DEFAULT_PARAMETERS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setParameters({ ...DEFAULT_PARAMETERS, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const update = (next: AtsocParameters) => {
    setParameters(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  const reset = () => update(DEFAULT_PARAMETERS);
  return { parameters, update, reset };
}
