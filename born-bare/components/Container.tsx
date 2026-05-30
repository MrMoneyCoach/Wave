import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "header" | "footer" | "nav";
};

export default function Container({ children, className, as: Tag = "div" }: Props) {
  return (
    <Tag className={cn("mx-auto max-w-page px-6 sm:px-10", className)}>
      {children}
    </Tag>
  );
}
