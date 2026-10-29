import { Mascot } from "./Mascot";

/** Logo Arah Assist di seluruh website: maskot map pada ubin biru */
export function LogoMark({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  return <Mascot size={size} animated={animated} />;
}
