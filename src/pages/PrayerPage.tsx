import { BookOpen, MoonStar } from 'lucide-react'
import { addDays, formatDateLong } from '../../shared/date'
import { BIG_GIFT_WEEKS, cairoInstant, FAJR, LATE_FLOOR, LATE_STEP_MIN, ON_TIME_MIN, PRAYER_PLACE, PRAYER_POINTS, PRAYERS, prayerFreeDates, prayerLog, prayerTimes, prayerWeeks } from '../../shared/prayer'
import { CONSTANCY, PRAYER_QUOTES, quoteOfDay } from '../../shared/prayerTexts'
import { Adhkar } from '../components/Adhkar'
import { PrayerShop, PrayerStreakCard } from '../components/PrayerShop'
import { PrayerGifts, PrayerHistory, PrayerRow, PrayerWeekCard, QuoteBlock, useNow } from '../components/Prayer'
import { Card, Notice, PageHeader } from '../components/ui'
import { useAppState } from '../state/AppData'

/** How many days back the page shows which prayers she prayed. */
const HISTORY_DAYS = 7

/** الصلاة: today's five prayers with their points, the week's gift, and the adhkar. */
export function PrayerPage() {
  const state = useAppState()
  const now = useNow()
  if (state.prayers === undefined || !state.profile.programStartDate) {
    return (
      <div className="page">
        <PageHeader eyebrow="الصلاة" title="صلاتك 🕌" />
        <Notice tone="info">الصفحة دي هتشتغل أول ما البرنامج يتحدّث 🤍</Notice>
      </div>
    )
  }
  const yesterday = addDays(state.today, -1)
  const free = prayerFreeDates(state.periods, state.today)
  const periodToday = free.has(state.today)
  // Last night's prayers can still be ticked until this morning's Fajr.
  const beforeFajr = now < cairoInstant(state.today, prayerTimes(state.today).prayers[FAJR])
  const openYesterday = beforeFajr && !free.has(yesterday) && state.days.some((day) => day.date === yesterday)
    && PRAYERS.some((_, prayer) => !prayerLog(state.prayers, yesterday, prayer))
  const weeks = prayerWeeks(state)
  const week = weeks[weeks.length - 1]
  const prayedToday = PRAYERS.reduce((sum, _, prayer) => sum + (prayerLog(state.prayers, state.today, prayer) ? 1 : 0), 0)

  return (
    <div className="page">
      <PageHeader eyebrow="الصلاة" title="صلاتك 🕌">
        <p>كل صلاة {PRAYER_POINTS} نقط لو صليتيها في أول ساعة من وقتها، وبعدها بتقل نقطة كل نص ساعة. الفجر ليه الـ {PRAYER_POINTS} كاملين في أي وقت. وكل أسبوع تواظبي فيه، ليكي هدية 🎁</p>
      </PageHeader>

      <QuoteBlock quote={quoteOfDay(PRAYER_QUOTES, state.today, 5)} />

      <PrayerGifts state={state} />

      {openYesterday && (
        <Card>
          <h2 className="card-title"><MoonStar /> امبارح</h2>
          <p className="muted small">لسه تقدري تسجّلي صلاة امبارح لحد الفجر.</p>
          <ul className="pill-list">{PRAYERS.map((_, prayer) => <PrayerRow key={prayer} state={state} date={yesterday} prayer={prayer} now={now} />)}</ul>
        </Card>
      )}

      <Card>
        <h2 className="card-title"><MoonStar /> النهارده، {formatDateLong(state.today)}</h2>
        {periodToday ? (
          <Notice tone="info">أيام البريود مفيش صلاة 🌸 ومش هتتحسب عليكي خالص. الذكر والدعا ليهم أجرهم، والأذكار تحت 🤍</Notice>
        ) : (
          <>
            <ul className="pill-list">{PRAYERS.map((_, prayer) => <PrayerRow key={prayer} state={state} date={state.today} prayer={prayer} now={now} />)}</ul>
            <p className="muted small">{prayedToday === PRAYERS.length ? 'صليتي الخمس صلوات النهارده، ربنا يتقبّل 🤍' : `مواعيد ${PRAYER_PLACE.name} (الهيئة المصرية العامة للمساحة). هبعتلك إشعار قبل كل صلاة بشوية، ومرة كمان قبل ما نقطها تبدأ تقل.`}</p>
          </>
        )}
      </Card>

      {week && <PrayerWeekCard week={week} state={state}><QuoteBlock quote={CONSTANCY} /></PrayerWeekCard>}
      {!week && (
        <Card>
          <h2 className="card-title">هدية الأسبوع 🎁</h2>
          <p className="muted">أول ما تسجّلي أول صلاة، يبدأ أسبوعك الأول. لو جمعتي 300 نقطة من 350 في الأسبوع (من غير أيام البريود) تاخدي هدية.</p>
        </Card>
      )}

      {week && <PrayerStreakCard state={state} />}

      <PrayerShop state={state} />

      {weeks[0] && weeks[0].start < state.today && (
        <Card>
          <h2 className="card-title">آخر {HISTORY_DAYS} أيام</h2>
          <PrayerHistory state={state} days={HISTORY_DAYS} />
        </Card>
      )}

      <Card id="section-adhkar">
        <h2 className="card-title"><BookOpen /> الأذكار</h2>
        <Adhkar date={state.today} />
      </Card>

      <Card>
        <h2 className="card-title">النقط بتتحسب إزاي؟</h2>
        <ul className="prayer-rules">
          <li>كل صلاة {PRAYER_POINTS} نقط، يعني {PRAYER_POINTS * PRAYERS.length} في اليوم.</li>
          <li>في أول {ON_TIME_MIN} دقيقة من وقت الصلاة النقط كاملة. بعدها نقطة أقل كل {LATE_STEP_MIN} دقيقة، ومتقلش عن {LATE_FLOOR}؛ الصلاة متأخر أحسن من إنها تفوت.</li>
          <li>الفجر ليه الـ {PRAYER_POINTS} نقط كاملين في أي وقت.</li>
          <li>تقدري تسجّلي الصلاة لحد فجر اليوم اللي بعده، ولو نسيتي تدوسي في وقتها اختاري الساعة اللي صليتي فيها.</li>
          <li>الأسبوع 7 أيام من أول يوم سجّلتي فيه صلاة. 300 نقطة من 350 = هدية 🎁 وأيام البريود بتتشال من الحساب.</li>
          <li>{BIG_GIFT_WEEKS} أسابيع هدية ورا بعض = الهدية الكبيرة 🏆</li>
          <li>كل نقط الصلاة اللي بتجمعيها بتتصرف في محل الصلاة، والهدايا مش بتاخد منها حاجة.</li>
        </ul>
        <p className="muted small">الآيات من نص المصحف في موقع تنزيل، والأحاديث من صحيح البخاري ومسلم وسنن أبي داود (اللي صححها الألباني)، والأذكار من حصن المسلم، وكل واحدة مكتوب جنبها مصدرها.</p>
      </Card>
    </div>
  )
}
