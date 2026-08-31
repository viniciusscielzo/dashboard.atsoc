"use client";
import { useState } from "react";
import { AtsocParameters, DEFAULT_PARAMETERS } from "./atsoc-control";
export function useAtsocParameters() {
  const [parameters, setParameters] =
    useState<AtsocParameters>(DEFAULT_PARAMETERS);
  const update = (next: AtsocParameters) => setParameters(next);
  const reset = () => update(DEFAULT_PARAMETERS);
  return { parameters, update, reset };
}
