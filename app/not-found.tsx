import Link from "next/link";

import { ForestBackdrop } from "@/components/shared/ForestBackdrop";

export default function NotFound() {
  return (
    <ForestBackdrop compact>
      <div className="mx-auto flex min-h-[75vh] max-w-xl flex-col items-center justify-center rounded-[2rem] bg-white/90 p-8 text-center shadow-sm">
        <span className="text-5xl">🌲</span>
        <h1 className="mt-4 text-2xl font-black text-[#173f2a]">
          这条森林小路还不存在
        </h1>
        <p className="mt-2 text-sm font-semibold text-[#74887b]">
          返回首页，继续比较级大冒险吧。
        </p>
        <Link
          href="/"
          className="mt-6 rounded-2xl bg-[#2d995b] px-6 py-4 font-black text-white"
        >
          返回英语森林
        </Link>
      </div>
    </ForestBackdrop>
  );
}
