/**
 * v0 by Vercel.
 * @see https://v0.dev/t/HTV1Riwb0VD
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
"use client";
import { useState } from "react";
import { Button } from "./button";
import { LinkButton } from "./link-button";
import { Textarea } from "./textarea";
import { ClipboardIcon, ClipboardCheckIcon, LoaderIcon } from "lucide-react";

import { useRouter } from "next/navigation";

function ReloadButton(props: { twitter: string; github: string }) {
  const { twitter, github } = props;
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const navigation = useRouter();
  return (
    <Button
      variant={"secondary"}
      disabled={isReloading || status !== null}
      className="flex flex-row gap-2"
      onClick={async () => {
        setIsReloading(true);
        const urlSearchParams = new URLSearchParams({
          github: github,
          twitter: twitter,
          reset: "true",
        });
        const res = await fetch(
          `/api/invalidate-public?${urlSearchParams.toString()}`,
          {
            method: "POST",
          },
        );
        setIsReloading(false);
        if (res.status === 200) {
          window.location.reload();
        } else {
          console.log(res, res.status);
        }
        if (res.status === 429) {
          setStatus(
            "Refreshing this profile is being rate limited, try again in 60 second",
          );
          // clear after 5 seconds
          setTimeout(() => {
            setStatus(null);
          }, 60000);
        }
      }}
    >
      {isReloading && (
        <LoaderIcon size={24} className="spin-slow animate-spin" />
      )}
      {status && <span>{status}</span>}
      Reload
    </Button>
  );
}

export function TweetBox(props: {
  src: string;
  text: string;
  twitter?: string;
  github?: string;
}) {
  const { src, text, twitter, github } = props;
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const queryParams = new URLSearchParams({
    text: text,
  });

  const copyToClipboard = async () => {
    try {
      // Create pseudo-element to load image in
      const img: HTMLImageElement = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = src;
      });

      // Render to unmounted canvas and rip image from that
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      if (!ctx) throw new Error("Could not get canvas context.");
      ctx.drawImage(img, 0, 0);

      const imageData: Blob = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else throw new Error("Canvas toBlob failed.");
        });
      });

      // Copy to clipboard if available
      if (typeof navigator?.share == "function") {
        const file = new File([imageData], "image.png", {
          type: imageData.type,
        });
        await navigator.share({
          title: "Share Image",
          text: "Check out my Shiptalkers image!",
          files: [file],
        });
        setCopySuccess(true);
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      } else if (typeof navigator?.clipboard?.write == "function") {
        await navigator.clipboard.write([
          new ClipboardItem({
            [imageData.type]: imageData,
          }),
        ]);
        setCopySuccess(true);
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      } else {
        console.error("Both Clipboard and Share APIs are not available.");
      }
    } catch (error) {
      console.error("Error copying image: ", error);
    }
  };
  
  return (
    <div className="mx-auto max-w-[100vw] rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="overflow-hidden  border-b-2 border-gray-200 dark:border-gray-800">
        <img
          src={src}
          width={300}
          height={200}
          key={src}
          alt="Placeholder"
          className="aspect-[2/1] w-[100vw] object-cover sm:h-[270px] md:w-[516px]"
        />
        <Textarea
          placeholder="What's on your mind?"
          defaultValue={text}
          className="min-h-[10px] w-full resize-none rounded-none border-0 p-4 py-0 dark:bg-gray-950 dark:text-gray-50"
          rows={3}
        />
      </div>
      <div className="mt-4 flex w-full items-center justify-end space-x-2">
        {twitter && github && (
          <ReloadButton twitter={twitter} github={github} />
        )}
        <Button
          onClick={copyToClipboard}
          variant={"secondary"}
          className="flex flex-row gap-2"
        >
          {copySuccess ? <ClipboardCheckIcon /> : <ClipboardIcon />} Copy Image
        </Button>
        <LinkButton
          href={"https://twitter.com/intent/tweet?" + queryParams.toString()}
          variant={"blue"}
          target="_blank"
        >
          Tweet
        </LinkButton>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ImageIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
