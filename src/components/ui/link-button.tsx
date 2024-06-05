import Link from "next/link";
import { buttonVariants } from "./button";
import { type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
export interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  children: React.ReactNode;
  href: string;
}
export function LinkButton(props: LinkButtonProps) {
  const { children, variant, className } = props;
  return (
    <Link className={cn(buttonVariants({ variant }), className)} {...props}>
      {children}
    </Link>
  );
}
