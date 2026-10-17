import type { Discovery } from "../lib/community";
import { defaultDiscovery } from "../lib/community";
export function DiscoveryFilters({
  value,
  onChange,
}: {
  value: Discovery;
  onChange: (f: Discovery) => void;
}) {
  const set = (k: keyof Discovery, v: string | boolean) =>
    onChange({ ...value, [k]: v });
  return (
    <section
      className="discovery"
      aria-label="Encontrar corridas perto de você"
    >
      <div className="split">
        <span className="eyebrow">UM CORREFÉ NO SEU RITMO</span>
        <button
          className="text-link"
          onClick={() => onChange(defaultDiscovery)}
        >
          Limpar filtros
        </button>
      </div>
      <div className="discovery-grid">
        <label>
          Cidade
          <input
            placeholder="Ex.: Porto Alegre"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </label>
        <label>
          Bairro
          <input
            placeholder="Ex.: Centro Histórico"
            value={value.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
          />
        </label>
        <label>
          Distância
          <select
            value={value.distance}
            onChange={(e) => set("distance", e.target.value)}
          >
            <option value="all">Qualquer distância</option>
            <option value="short">Até 5 km</option>
            <option value="medium">Mais de 5 até 10 km</option>
            <option value="long">Mais de 10 km</option>
          </select>
        </label>
        <label>
          Ritmo habitual
          <select
            value={value.pace}
            onChange={(e) => set("pace", e.target.value)}
          >
            <option value="all">Todos os ritmos</option>
            <option value="easy">Leve · 7:00+ /km</option>
            <option value="steady">Moderado · 5:00–6:59</option>
            <option value="fast">Rápido · até 4:59</option>
          </select>
        </label>
      </div>
      <div className="check-row">
        <label>
          <input
            type="checkbox"
            checked={value.beginner}
            onChange={(e) => set("beginner", e.target.checked)}
          />{" "}
          Para iniciantes
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.inclusive}
            onChange={(e) => set("inclusive", e.target.checked)}
          />{" "}
          Ninguém fica para trás
        </label>
      </div>
      <p className="microcopy">
        Local informado pelo organizador. Sem acesso à sua localização.
      </p>
    </section>
  );
}
