import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-line mt-auto">
      <div className="container-x py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="flex items-baseline gap-2.5">
              <span className="font-serifcn font-black text-lg">学桥</span>
              <span className="mono text-[9px] tracking-[0.3em] text-dim">STUDYBRIDGE</span>
            </div>
            <p className="mt-4 text-[13px] leading-[1.9] text-mute max-w-sm">
              一座连接大学生教员与家庭的桥。平台仅提供信息发布与撮合服务，不组织培训、不代收课时费；
              课程质量与安全请双方在试听与沟通中自行把握。
            </p>
          </div>
          <div className="lg:col-span-3 lg:col-start-8">
            <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase mb-4">Index / 索引</p>
            <div className="flex flex-col gap-2.5 text-[13.5px]">
              <Link href="/tutors" className="link-slide w-fit">教员库</Link>
              <Link href="/#process" className="link-slide w-fit">撮合流程</Link>
              <Link href="/#trust" className="link-slide w-fit">互信机制</Link>
              <Link href="/register" className="link-slide w-fit">注册教员</Link>
            </div>
          </div>
          <div className="lg:col-span-2">
            <p className="mono text-[10px] tracking-[0.32em] text-dim uppercase mb-4">Contact / 联络</p>
            <div className="flex flex-col gap-2.5 text-[13.5px] text-mute">
              <span>hello@studybridge.cn</span>
              <span className="mono text-[11px]">EST. 2026</span>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="mono text-[10px] tracking-[0.2em] text-dim">
            © 2026 STUDYBRIDGE · INFORMATION MATCHING ONLY
          </p>
          <p className="mono text-[10px] tracking-[0.2em] text-dim">信息撮合 · 不涉学科培训经营</p>
        </div>
      </div>
    </footer>
  );
}
