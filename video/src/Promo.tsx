import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { LiveAppScene } from "./components/LiveAppScene";
import { AudienceScene } from "./scenes/AudienceScene";
import { BrandScene } from "./scenes/BrandScene";
import { CtaScene } from "./scenes/CtaScene";
import { HookScene } from "./scenes/HookScene";
import { OfflineScene } from "./scenes/OfflineScene";

const TRANSITION = 15;

// Quellvideos: 30 fps – Zeitangaben in Frames (s * 30)
const VENTE_SEGMENTS = [
  // Caisse oeffnen + 4 Produkte antippen (zuegig)
  { src: "recordings/vente.mp4", startFrom: 294, endAt: 546, playbackRate: 1.65 },
  // Zahlungsmodal: Espèces, +10.000, Monnaie, Bon (fast Echtzeit)
  { src: "recordings/vente.mp4", startFrom: 546, endAt: 900, playbackRate: 1.15 },
];

const INVENTAIRE_SEGMENTS = [
  { src: "recordings/inventaire.mp4", startFrom: 135, endAt: 405, playbackRate: 1.5 },
];

const ANALYTICS_SEGMENTS = [
  { src: "recordings/analytics.mp4", startFrom: 285, endAt: 615, playbackRate: 1.45 },
];

const scenes = [
  { component: HookScene, duration: 105 },
  { component: BrandScene, duration: 135 },
  {
    component: () => (
      <LiveAppScene
        title="Encaissez"
        highlight="en quelques secondes"
        segments={VENTE_SEGMENTS}
      />
    ),
    duration: 461,
  },
  {
    component: () => (
      <LiveAppScene
        title="Votre stock"
        highlight="toujours à jour"
        segments={INVENTAIRE_SEGMENTS}
      />
    ),
    duration: 180,
  },
  {
    component: () => (
      <LiveAppScene
        title="Analysez"
        highlight="vos recettes"
        segments={ANALYTICS_SEGMENTS}
      />
    ),
    duration: 228,
  },
  { component: OfflineScene, duration: 180 },
  { component: AudienceScene, duration: 150 },
  { component: CtaScene, duration: 210 },
];

const totalSceneFrames = scenes.reduce((sum, scene) => sum + scene.duration, 0);

/** Gesamtdauer: Szenen minus Überlappung durch die Fade-Transitions */
export const PROMO_DURATION =
  totalSceneFrames - (scenes.length - 1) * TRANSITION;

export const Promo: React.FC = () => {
  return (
    <TransitionSeries>
      {scenes.map((scene, i) => {
        const SceneComponent = scene.component;
        return (
          <>
            <TransitionSeries.Sequence durationInFrames={scene.duration}>
              <SceneComponent />
            </TransitionSeries.Sequence>
            {i < scenes.length - 1 ? (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION })}
              />
            ) : null}
          </>
        );
      })}
    </TransitionSeries>
  );
};
