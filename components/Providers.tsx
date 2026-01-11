"use client";

import { VoiceProvider } from "@/lib/state/voice-context";
import { FormProvider } from "@/lib/state/form-context";
import { TabClickProvider } from "@/components/Layout/TopNav";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <VoiceProvider>
      <FormProvider>
        <TabClickProvider>
          {children}
        </TabClickProvider>
      </FormProvider>
    </VoiceProvider>
  );
}
