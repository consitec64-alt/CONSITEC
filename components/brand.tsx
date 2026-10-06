import Image from "next/image";
import Link from "next/link";

export default function Brand({ href, className = "" }: { href: "/" | "/dashboard"; className?: string }) {
  return <Link href={href} className={`brand official-brand ${className}`}>
    <Image src="/consitec-logo.png" alt="CONSITEC" width={649} height={409} sizes="176px" className="consitec-logo" priority />
  </Link>;
}
