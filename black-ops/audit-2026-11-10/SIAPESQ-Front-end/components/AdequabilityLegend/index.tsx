"use client";

interface AdequabilityLegendProps {
  min?: number;
  middle?: number;
  max?: number;
}

export function AdequabilityLegend({
  min = 0,
  middle = 0.5,
  max = 1,
}: AdequabilityLegendProps) {
  const fmt = (v: number) => v.toFixed(1).replace(".", ",");

  return (
    <div
      className="absolute bottom-8 right-3 z-[900] rounded-lg px-3 py-2 shadow-lg"
      style={{ backgroundColor: "rgba(255,255,255,0.9)", minWidth: 120 }}
    >
      <p
        className="text-[9px] font-bold uppercase tracking-wider mb-1.5 text-center"
        style={{ color: "#374151" }}
      >
        Adequabilidade
      </p>

      <div
        className="h-3 w-full rounded-sm mb-1"
        style={{
          background:
            "linear-gradient(to right, #30123b, #4145ab, #4775de, #29bbec, #1ae4b6, #71fe5f, #d2e535, #f9a330, #fb8022, #e14f28, #b11901, #7a0403)",
        }}
      />

      <div className="flex justify-between text-[9px]" style={{ color: "#374151" }}>
        <span>
          <span className="block font-semibold">Baixa</span>
          {fmt(min)}
        </span>
        <span className="text-center">
          <span className="block font-semibold">Média</span>
          {fmt(middle)}
        </span>
        <span className="text-right">
          <span className="block font-semibold">Alta</span>
          {fmt(max)}
        </span>
      </div>
    </div>
  );
}
