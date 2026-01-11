// 기본정보 폼 데이터를 임시로 저장하는 Context (저장 없음, 메모리만)
"use client";
import React from "react";

export type FormData = {
  name: string;
  gender: string;
  age: string;
  address: { sido: string; gugun: string; detailAddress: string };
  desiredJob: { selected: string; custom: string };
  career: { organization: string; period: string; periodUnit: string; duties: string };
  strengths: string;
  weaknesses: string;
};

type FormContextValue = {
  formData: FormData | null;
  setFormData: (data: FormData | null) => void;
};

const FormContext = React.createContext<FormContextValue | undefined>(undefined);

export function FormProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = React.useState<FormData | null>(null);

  return (
    <FormContext.Provider value={{ formData, setFormData }}>
      {children}
    </FormContext.Provider>
  );
}

export function useFormData() {
  const ctx = React.useContext(FormContext);
  if (!ctx) throw new Error("useFormData must be used within FormProvider");
  return ctx;
}
