"use client";
import Image from "next/image";
import { useState } from "react";
export default function GuideCover({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="cover-frame">
      {src && !failed ? (
        <Image
          src={src}
          alt="The ₹70K+ PPF Offer Secret — uploaded guide cover by OGLITY"
          width={1055}
          height={1491}
          unoptimized
          loading="eager"
          fetchPriority="high"
          onError={() => setFailed(true)}
          className="guide-cover-image"
        />
      ) : (
        <div className="cover-placeholder">
          <span>YOUR FREE GUIDE</span>
          <strong>
            The ₹70K+
            <br />
            PPF Offer Secret
          </strong>
          <p>
            {src
              ? "Guide cover could not be loaded."
              : "Guide cover image URL pending."}
          </p>
        </div>
      )}
    </figure>
  );
}
