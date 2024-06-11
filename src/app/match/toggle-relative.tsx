"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { HelpCircleIcon } from "lucide-react";

export function ToggleRelative(props: { relative: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  return (
    <div className="flex flex-row items-center gap-4">
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger>
            <HelpCircleIcon size={20} />
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px]">
            Use this if you want to compare based on percentage of tweets and
            commits, rather than total. Useful for comparing users with
            different activity levels.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Label htmlFor="relative">Relative</Label>
      <Switch
        id="relative"
        checked={props.relative}
        onCheckedChange={() => {
          const params = new URLSearchParams(searchParams);
          params.set("rel", String(!props.relative));
          router.replace(`${pathname}?${params.toString()}`);
        }}
      />
    </div>
  );
}
