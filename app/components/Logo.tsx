import Image from "next/image";
import logo from "./logo9.png";

type Props = {
  height?: number;
};

export default function Logo({ height = 40 }: Props) {
  return (
    <Image
      src={logo}
      alt="SWUtopia"
      height={height}
      width={Math.round(height * (logo.width / logo.height))}
      style={{ objectFit: "contain" }}
      priority
    />
  );
}
