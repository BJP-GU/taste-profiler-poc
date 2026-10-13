import Link from "next/link";
import { listWeb2References } from "@/lib/web2Db";
import { calibrationStatus } from "@/lib/pseudoClient";
import CalibrationBar from "@/components/CalibrationBar";
import CatalogGrid from "@/components/CatalogGrid";

export const dynamic = "force-dynamic";

export default function Web2CatalogPage() {
  const refs = listWeb2References();
  const calibration = calibrationStatus(refs);

  return (
    <div className="space-y-8">
      <div>
        <p className="mono text-xs tracking-wide uppercase text-black/50 mb-2">
          Support set
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          Catalog <span className="mono text-base text-black/40">({refs.length})</span>
        </h1>
        <p className="text-sm text-black/60 mt-2 max-w-xl leading-relaxed">
          Each reference is a URL with a whole-site like/dislike label and facet
          descriptors used for contrastive taste synthesis.
        </p>
      </div>

      <CalibrationBar calibration={calibration} />

      {refs.length === 0 && (
        <p className="text-sm text-black/60">
          No references yet.{" "}
          <Link href="/web2" className="underline underline-offset-2">
            Add a website
          </Link>
          .
        </p>
      )}

      {refs.length > 0 && <CatalogGrid refs={refs} />}
    </div>
  );
}
