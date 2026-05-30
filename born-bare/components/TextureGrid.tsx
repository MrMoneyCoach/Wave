import Reveal from "./Reveal";
import ImagePlaceholder from "./ImagePlaceholder";

type Tile = {
  name: string;
  prompt: string;
  caption: string;
  span?: "default" | "tall";
};

type Props = {
  tiles: Tile[];
};

/**
 * Editorial 3-up tile grid for sensory / world-building moments —
 * the gallery beat between narrative sections.
 */
export default function TextureGrid({ tiles }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
      {tiles.map((tile, i) => (
        <Reveal key={tile.name} delay={i * 0.1}>
          <figure className="group relative">
            <ImagePlaceholder
              name={tile.name}
              prompt={tile.prompt}
              ratio={tile.span === "tall" ? "portrait" : "portrait"}
              className="!border-0"
            />
            <figcaption className="mt-4 font-sans text-caption uppercase tracking-[0.24em] text-stone">
              {tile.caption}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}
