import { PlaceholderPage } from "@/components/PlaceholderPage";
import { PlatformLayout } from "@/components/PlatformLayout";

export default function NotFound() {
  return (
    <PlatformLayout>
      <PlaceholderPage label="CheckMeOut" title="Page not found">
        <p>This address doesn&apos;t belong to a page or portfolio on CheckMeOut.</p>
      </PlaceholderPage>
    </PlatformLayout>
  );
}
