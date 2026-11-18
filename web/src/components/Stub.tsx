// Placeholder used by every not-yet-built page. Replace it with the real page - delete the Stub.
export default function Stub({ title, owner, wireframe, uses }: { title: string; owner: string; wireframe: string; uses?: string }) {
  return (
    <div className="rounded border-2 border-dashed p-4 text-sm">
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p>Owner: <b>{owner}</b></p>
      <p>Wireframe: {wireframe}</p>
      {uses && <p>Uses: <code>{uses}</code></p>}
    </div>
  );
}
