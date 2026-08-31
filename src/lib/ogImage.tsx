export function OgImageContent({
  logoUrl,
  title,
  subtitle,
}: {
  logoUrl?: string | null;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          width={160}
          height={160}
          style={{ borderRadius: 32, marginBottom: 36 }}
        />
      )}
      <div
        style={{
          display: "flex",
          fontSize: title && title.length > 22 ? 68 : 96,
          fontWeight: 700,
          maxWidth: 1040,
          textAlign: "center",
          lineHeight: 1.1,
          padding: "0 40px",
        }}
      >
        {title ?? (
          <>
            <span style={{ display: "flex" }}>Albums&nbsp;</span>
            <span style={{ display: "flex", color: "#F760D6" }}>
              Anonymous
            </span>
          </>
        )}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 32,
          marginTop: 28,
          color: "rgba(255,255,255,0.7)",
          maxWidth: 1000,
          textAlign: "center",
        }}
      >
        {subtitle ?? "Funny original songs & a comedy podcast about albums"}
      </div>
    </div>
  );
}
