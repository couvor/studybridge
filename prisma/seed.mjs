// 学桥 seed：科目、示例教员、示例需求、撮合单、评价、通知、demo 账号
// 运行：npm run db:seed（会清空后重灌）
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// 生产安全守卫：seed 会清空重灌且含弱密码演示账号，生产环境必须显式声明才允许执行
if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "1") {
  console.error("[seed] 拒绝执行：当前为生产环境。如确需重灌演示数据，请显式设置 SEED_ALLOW_PRODUCTION=1。");
  process.exit(1);
}

const db = new PrismaClient();
const PASSWORD = "demo1234";

const SUBJECTS = [
  { name: "英语口语", category: "LANGUAGE" },
  { name: "日语入门", category: "LANGUAGE" },
  { name: "法语入门", category: "LANGUAGE" },
  { name: "Python 编程", category: "CODING" },
  { name: "C/C++ 程序设计", category: "CODING" },
  { name: "创意编程（少儿）", category: "CODING" },
  { name: "钢琴", category: "ART" },
  { name: "素描与色彩", category: "ART" },
  { name: "声乐", category: "ART" },
  { name: "羽毛球", category: "SPORT" },
  { name: "游泳", category: "SPORT" },
  { name: "篮球", category: "SPORT" },
  { name: "高等数学", category: "UNI_COURSE" },
  { name: "线性代数", category: "UNI_COURSE" },
  { name: "大学物理", category: "UNI_COURSE" },
  { name: "概率统计", category: "UNI_COURSE" },
  { name: "考研数学", category: "EXAM" },
  { name: "考研英语", category: "EXAM" },
  { name: "四六级英语", category: "EXAM" },
  { name: "雅思 / 托福", category: "EXAM" },
];

const CATEGORIES = [
  { key: "LANGUAGE", label: "语言", en: "LANGUAGES", desc: "口语陪练与第二外语入门" },
  { key: "CODING", label: "编程", en: "CODING", desc: "从图形化创意到算法竞赛" },
  { key: "ART", label: "艺术", en: "ARTS", desc: "器乐、美术与声乐基础训练" },
  { key: "SPORT", label: "体育", en: "SPORTS", desc: "伴随成长的运动技能陪练" },
  { key: "UNI_COURSE", label: "大学课业", en: "UNIVERSITY", desc: "挂科预警与转专业补强" },
  { key: "EXAM", label: "考试考证", en: "EXAMINATIONS", desc: "四六级、考研与留学语考" },
];

const TUTORS = [
  { email: "tutor@demo.cn", name: "沈亦舟", university: "复旦大学", major: "数学科学学院", grade: "研一", subjects: ["考研数学", "高等数学"], mode: "BOTH", region: "上海 · 杨浦区", time: "工作日晚间 / 全天周末", bio: "考研数学 142 分，带过三届考研学生，擅长把抽象概念拆成可执行的解题流程。授课风格：先搭框架，再刷题型，每课留一分钟复述检验。", rating: 4.9, count: 27 },
  { email: "tutor2@demo.cn", name: "顾清和", university: "上海交通大学", major: "外国语学院", grade: "大三", subjects: ["英语口语", "雅思 / 托福"], mode: "ONLINE", region: "上海", time: "周二四晚 / 周日全天", bio: "雅思 8.0，口语单项 7.5。课程以真实场景对话为主，拒绝背诵式输出。适合留学语考与口语长期陪练。", rating: 4.8, count: 19 },
  { email: "tutor3@demo.cn", name: "陆则明", university: "浙江大学", major: "计算机科学与技术", grade: "大四", subjects: ["Python 编程", "C/C++ 程序设计"], mode: "BOTH", region: "杭州 · 西湖区", time: "周一至周五 18:00 后", bio: "ACM 区域赛银牌，带过初中信息学竞赛与大学 C 语言补差。讲义全部自编，按学生节奏调整。", rating: 4.9, count: 33 },
  { email: "tutor4@demo.cn", name: "许南絮", university: "华东师范大学", major: "音乐学系", grade: "研二", subjects: ["钢琴", "声乐"], mode: "OFFLINE", region: "上海 · 闵行区", time: "周末全天 / 工作日傍晚", bio: "钢琴十级、声乐九级，少儿考级与成人兴趣都带。重视基本功与乐感并进，课堂记录会同步给家长。", rating: 4.7, count: 21 },
  { email: "tutor5@demo.cn", name: "韩叙", university: "南京大学", major: "物理学院", grade: "研三", subjects: ["大学物理", "概率统计"], mode: "ONLINE", region: "南京", time: "晚间 / 周末", bio: "曾任职校内高数辅导中心两年，专治『听懂了但不会做题』。配套自整理题型手册与错题复盘模板。", rating: 4.8, count: 15 },
  { email: "tutor6@demo.cn", name: "方晚晴", university: "武汉大学", major: "新闻与传播学院", grade: "大二", subjects: ["英语口语", "四六级英语"], mode: "ONLINE", region: "武汉", time: "工作日晚间", bio: "四六级双 650+，外研社国赛二等奖。轻松派课堂，用播客和美剧做精听材料，四六级冲刺经验丰富。", rating: 4.6, count: 9 },
  { email: "tutor7@demo.cn", name: "魏长风", university: "同济大学", major: "体育与健康学院", grade: "大四", subjects: ["羽毛球", "游泳"], mode: "OFFLINE", region: "上海 · 杨浦区", time: "清晨 / 周末全天", bio: "羽毛球国家二级运动员，少儿体适能教练证。注重动作规范与兴趣保护，家长可全程旁观。", rating: 4.8, count: 24 },
  { email: "tutor8@demo.cn", name: "苏砚", university: "中央美术学院", major: "造型学院", grade: "研二", subjects: ["素描与色彩"], mode: "OFFLINE", region: "北京 · 朝阳区", time: "周末 / 假期集训", bio: "联考校考双高分，带艺考启蒙与成人零基础。从观察方法教起，不套路不速成。", rating: 4.9, count: 17 },
  { email: "tutor9@demo.cn", name: "江洄", university: "中山大学", major: "外国语学院", grade: "研一", subjects: ["日语入门", "英语口语"], mode: "BOTH", region: "广州 · 海珠区", time: "周中晚间 / 周末", bio: "日语 N1 148 分，J-TEST 实战派。五十音到 N3 的路线图非常成熟，二次元兴趣入坑党友好。", rating: 4.7, count: 12 },
  { email: "tutor10@demo.cn", name: "程野", university: "华中科技大学", major: "计算机学院", grade: "大三", subjects: ["创意编程（少儿）", "Python 编程"], mode: "ONLINE", region: "武汉", time: "周六日全天", bio: "带过三个少儿编程小班，Scratch 到 Python 的平滑衔接是拿手项目。课堂节奏慢，成就感给足。", rating: 4.8, count: 14 },
  { email: "tutor11@demo.cn", name: "白书宁", university: "四川大学", major: "数学学院", grade: "大二", subjects: ["高等数学", "线性代数"], mode: "ONLINE", region: "成都", time: "晚间弹性", bio: "刚经历考研季，知识点手感正热。价格友好，适合只想及格保住绩点的同学。", rating: 4.5, count: 6 },
  { email: "tutor12@demo.cn", name: "贺知远", university: "北京外国语大学", major: "日语学院", grade: "大四", subjects: ["日语入门", "四六级英语"], mode: "BOTH", region: "北京 · 海淀区", time: "工作日晚 / 周末上午", bio: "中日交流标准日本语全部课文录音范读者。发音控，跟着练口语会不自觉变标准。", rating: 4.6, count: 11 },
];

const PENDING_TUTORS = [
  { email: "tutornew1@demo.cn", name: "秦朗", university: "复旦大学", major: "经济学系", grade: "大二", subjects: ["概率统计", "四六级英语"], mode: "BOTH", region: "上海", time: "晚间 / 周末", bio: "高考数学 145，大一横扫两门数学满绩。希望积累带教经验，认真负责型选手。" },
  { email: "tutornew2@demo.cn", name: "温以宁", university: "上海音乐学院", major: "音乐教育系", grade: "研一", subjects: ["钢琴", "声乐"], mode: "OFFLINE", region: "上海 · 徐汇区", time: "周三五下午 / 周末", bio: "音乐教育方向，英皇考级体系熟悉，希望主接少儿启蒙。" },
];

const PARENTS = [
  { email: "parent@demo.cn", name: "周女士", phone: "13800000001" },
  { email: "parent2@demo.cn", name: "吴先生", phone: "13800000002" },
  { email: "parent3@demo.cn", name: "郑女士", phone: "13800000003" },
];

const DEMANDS = [
  { parent: 0, subject: "考研数学", learnerGrade: "大三（本人）", mode: "BOTH", region: "上海 · 杨浦区", frequency: "每周 2 次，每次 2 小时", budgetNote: "期望 150 元/小时上下，可议", description: "数学基础尚可，目标 26 考研数学一 130+。目前概率论薄弱，希望系统梳理+专题突破，最好每周有阶段小测。", status: "OPEN", review: "APPROVED" },
  { parent: 0, subject: "钢琴", learnerGrade: "小学三年级", mode: "OFFLINE", region: "上海 · 闵行区", frequency: "每周 1 次，每次 45 分钟", budgetNote: "按次结算，价格面议", description: "零基础女宝，性格安静，想培养一个能坚持的爱好。希望老师有考级路线经验，家长会旁听。", status: "OPEN", review: "APPROVED" },
  { parent: 1, subject: "Python 编程", learnerGrade: "初中二年级", mode: "ONLINE", region: "", frequency: "每周 1 次，每次 1.5 小时", budgetNote: "希望有试听，预算 200 元/小时以内", description: "孩子自学过 Scratch，想衔接到 Python。目标是信息学入门，不功利，先保护兴趣。", status: "OPEN", review: "APPROVED" },
  { parent: 1, subject: "高等数学", learnerGrade: "大一（本人）", mode: "ONLINE", region: "", frequency: "考前集中，每周 2 次", budgetNote: "学生党预算有限，求性价比", description: "期中挂科预警，极限与微分中值定理部分完全没跟上。目标：期末 80+，顺便把基础补回来。", status: "OPEN", review: "APPROVED" },
  { parent: 2, subject: "英语口语", learnerGrade: "高一", mode: "ONLINE", region: "", frequency: "每周 2 次，每次 1 小时", budgetNote: "长期稳定，价格可谈", description: "应试不错但开口就卡壳，计划一年后转国际课程方向。希望全英文环境浸泡，纠正发音。", status: "OPEN", review: "APPROVED" },
  { parent: 2, subject: "羽毛球", learnerGrade: "小学五年级", mode: "OFFLINE", region: "上海 · 杨浦区", frequency: "每周 1 次，每次 2 小时", budgetNote: "场地家长负责，课时费面议", description: "男孩，精力旺盛，学校社团落选想加练。有无考级经验不限，重点是规范动作、消耗体力。", status: "MATCHED", review: "APPROVED" },
  { parent: 0, subject: "四六级英语", learnerGrade: "大一（本人）", mode: "ONLINE", region: "", frequency: "每周 1 次", budgetNote: "", description: "室友推荐来的，目标 12 月六级 550+，听力是弱项。", status: "CLOSED", review: "APPROVED" },
  { parent: 1, subject: "游泳", learnerGrade: "幼儿园大班", mode: "OFFLINE", region: "杭州 · 西湖区", frequency: "每周 2 次", budgetNote: "", description: "想让孩子暑期前学会蛙泳，要求教练有少儿教学经验。", status: "OPEN", review: "PENDING" },
];

async function main() {
  console.log("清空旧数据…");
  await db.notification.deleteMany();
  await db.review.deleteMany();
  await db.lessonLog.deleteMany();
  await db.order.deleteMany();
  await db.application.deleteMany();
  await db.demand.deleteMany();
  await db.tutorProfile.deleteMany();
  await db.subject.deleteMany();
  await db.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);

  console.log("写入科目…");
  const subjectRows = {};
  for (const s of SUBJECTS) {
    subjectRows[s.name] = await db.subject.create({ data: { name: s.name, category: s.category } });
  }

  console.log("写入管理员与家长…");
  await db.user.create({ data: { role: "ADMIN", email: "admin@mingyanginfo.com", passwordHash: hash, name: "平台运营", phone: "13700000000" } });
  const parentIds = [];
  for (const p of PARENTS) {
    const u = await db.user.create({ data: { role: "PARENT", email: p.email, passwordHash: hash, name: p.name, phone: p.phone } });
    parentIds.push(u.id);
  }

  console.log("写入教员…");
  const tutorIds = [];
  const tutorByName = {};
  const tutorUserIdByName = {};
  for (const t of TUTORS) {
    const u = await db.user.create({
      data: {
        role: "TUTOR", email: t.email, passwordHash: hash, name: t.name, phone: "139" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0"),
        tutorProfile: {
          create: {
            university: t.university, major: t.major, grade: t.grade, bio: t.bio,
            availableTime: t.time, mode: t.mode, region: t.region,
            auditStatus: "APPROVED", ratingAvg: t.rating, ratingCount: t.count,
            subjects: { connect: t.subjects.map((s) => ({ id: subjectRows[s].id })) },
          },
        },
      },
      include: { tutorProfile: true },
    });
    tutorIds.push(u.tutorProfile.id);
    tutorByName[t.name] = u.tutorProfile.id;
    tutorUserIdByName[t.name] = u.id;
  }
  for (const t of PENDING_TUTORS) {
    await db.user.create({
      data: {
        role: "TUTOR", email: t.email, passwordHash: hash, name: t.name, phone: "139" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0"),
        tutorProfile: {
          create: {
            university: t.university, major: t.major, grade: t.grade, bio: t.bio,
            availableTime: t.time, mode: t.mode, region: t.region,
            auditStatus: "PENDING",
            subjects: { connect: t.subjects.map((s) => ({ id: subjectRows[s].id })) },
          },
        },
      },
    });
  }

  console.log("写入求教单…");
  const demandIds = [];
  let dSeq = 1;
  for (const d of DEMANDS) {
    const row = await db.demand.create({
      data: {
        code: "D-" + String(dSeq++).padStart(4, "0"),
        parentId: parentIds[d.parent],
        subjectId: subjectRows[d.subject].id,
        learnerGrade: d.learnerGrade, mode: d.mode, region: d.region,
        frequency: d.frequency, budgetNote: d.budgetNote, description: d.description,
        status: d.status, reviewStatus: d.review,
      },
    });
    demandIds.push(row.id);
  }

  console.log("写入报名与撮合单…");
  // 需求 6（羽毛球，MATCHED）：教员 7（魏长风）报名并被接受 → ACTIVE 订单
  await db.application.create({ data: { demandId: demandIds[5], tutorId: tutorByName["魏长风"], message: "国家二级运动员，带过 6 个同年龄段孩子，第一课会先做动作评估。", status: "ACCEPTED" } });
  await db.application.create({ data: { demandId: demandIds[5], tutorId: tutorByName["白书宁"], message: "羽毛球校队成员，可以陪练加基础。", status: "REJECTED" } });
  const order1 = await db.order.create({
    data: { code: "O-0001", demandId: demandIds[5], parentId: parentIds[2], tutorId: tutorByName["魏长风"], status: "ACTIVE", matchSource: "PARENT_ACCEPT" },
  });

  // 需求 7（四六级，CLOSED）：已完结订单 + 双向评价 + 课时记录
  await db.application.create({ data: { demandId: demandIds[6], tutorId: tutorByName["方晚晴"], message: "四六级听力有专门的精听方法论，可以试听看看合不合拍。", status: "ACCEPTED" } });
  const order2 = await db.order.create({
    data: { code: "O-0002", demandId: demandIds[6], parentId: parentIds[0], tutorId: tutorByName["方晚晴"], status: "FINISHED", matchSource: "PARENT_ACCEPT", finishedAt: new Date(Date.now() - 86400000 * 3) },
  });
  await db.lessonLog.create({ data: { orderId: order2.id, date: new Date(Date.now() - 86400000 * 20), hours: 1.5, feedback: "第一次课做了听力摸底，长对话正确率 60%，定了精听计划。" } });
  await db.lessonLog.create({ data: { orderId: order2.id, date: new Date(Date.now() - 86400000 * 13), hours: 1.5, feedback: "精听方法上手了，正确率 75%。课后作业有点多，孩子反馈略累。" } });
  await db.lessonLog.create({ data: { orderId: order2.id, date: new Date(Date.now() - 86400000 * 6), hours: 1.5, feedback: "正确率 88%，进度不错，考前安排两次真题模拟。" } });
  await db.review.create({ data: { orderId: order2.id, authorRole: "PARENT", rating: 5, comment: "非常负责，每次课后都有详细反馈，方法也成体系。推荐！" } });
  await db.review.create({ data: { orderId: order2.id, authorRole: "TUTOR", rating: 5, comment: "家长配合度高，孩子执行力强，很愉快的一段教学。" } });

  // 需求 1（考研数学）：教员 demo（沈亦舟）待家长确认的报名
  await db.application.create({ data: { demandId: demandIds[0], tutorId: tutorByName["沈亦舟"], message: "三届考研带教经验，概率论专题是我的拿手模块，可以先约一次免费沟通。", status: "PENDING" } });
  await db.application.create({ data: { demandId: demandIds[0], tutorId: tutorByName["白书宁"], message: "今年刚考完，手感正热，价格友好。", status: "PENDING" } });

  console.log("写入通知…");
  await db.notification.createMany({
    data: [
      { userId: parentIds[0], type: "APPLICATION", content: "你的求教单 D-0001（考研数学）收到 2 份新报名，快去看看吧。", link: `/parent/demands/${demandIds[0]}` },
      { userId: parentIds[0], type: "ORDER", content: "O-0002 已完结，别忘了给教员写评价。", link: "/parent/orders" },
      { userId: tutorUserIdByName["沈亦舟"], type: "APPLICATION", content: "你对 D-0001（考研数学）的报名已提交，等待家长确认。", link: "/tutor/applications" },
    ],
  });

  console.log("完成 ✔  demo 账号密码均为 " + PASSWORD);
  console.log("  admin@mingyanginfo.com / parent@demo.cn / tutor@demo.cn");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
