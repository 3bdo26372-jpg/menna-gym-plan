import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { dayNumberFor, formatDateFull, periodBounds, periodForDay } from '../../shared/date'
import { REPORT_LABEL, REPORT_LENGTH, type ReportData } from '../../shared/report'
import type { ReportKind } from '../../shared/types'
import { Card, ChoiceGroup, EmptyState, Notice, PageHeader } from '../components/ui'
import { ReportDocument } from '../report/ReportDocument'
import { exportReportPdf } from '../report/exportPdf'
import { useAppData, useAppState } from '../state/AppData'

export function ReportsPage() {
  const state = useAppState()
  const { generateReport, getReport } = useAppData()
  const [rendering, setRendering] = useState<ReportData | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<ReportKind>('week')
  const start = state.profile.programStartDate

  if (!start) {
    return (
      <div className="page">
        <PageHeader eyebrow="التقارير" title="التقارير الأسبوعية والشهرية" />
        <EmptyState icon={<FileText />} title="التقارير بتبدأ مع اليوم الأول">ابدئي البرنامج من الصفحة الرئيسية.</EmptyState>
      </div>
    )
  }

  const length = REPORT_LENGTH[kind]
  const label = REPORT_LABEL[kind]
  const current = periodForDay(dayNumberFor(start, state.today), length)
  const periods = Array.from({ length: current }, (_, index) => current - index)

  async function run(periodIndex: number, mode: 'new' | 'saved') {
    setBusy(periodIndex)
    setError(null)
    try {
      setRendering(mode === 'new' ? await generateReport(kind, periodIndex) : await getReport(kind, periodIndex))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذّر إنشاء التقرير')
      setBusy(null)
    }
  }

  return (
    <div className="page">
      <PageHeader eyebrow="التقارير" title="التقارير الأسبوعية والشهرية">
        <p>تقرير PDF كل أسبوع (٧ أيام) وكل شهر (٣٠ يوم): النقاط، التمارين، القياسات، سجل الأكل والشرب، المكافآت، واقتراحات. كل تقرير بيتحفظ وتقدري تحمّليه تاني.</p>
      </PageHeader>
      <ChoiceGroup legend="نوع التقرير" options={[{ value: 'week' as const, label: 'أسبوعي' }, { value: 'month' as const, label: 'شهري' }]} value={kind} onChange={setKind} columns={2} />
      {error && <Notice tone="care">{error}</Notice>}
      <div className="report-list">
        {periods.map((periodIndex) => {
          const bounds = periodBounds(start, periodIndex, length)
          const saved = state.reports.find((report) => report.kind === kind && report.periodIndex === periodIndex)
          const inProgress = bounds.end >= state.today
          return (
            <Card key={`${kind}-${periodIndex}`} as="article" className="report-item">
              <div>
                <p className="eyebrow">{inProgress ? `${label} الحالي` : `${label} مكتمل`}</p>
                <h2>{label} {periodIndex}</h2>
                <p className="muted">{formatDateFull(bounds.start)} – {formatDateFull(bounds.end)}</p>
                {saved && <p className="muted small">آخر نسخة محفوظة: {formatDateFull(saved.generatedAt.slice(0, 10))}</p>}
              </div>
              <div className="report-actions">
                <button type="button" className="button primary" disabled={busy !== null} onClick={() => void run(periodIndex, 'new')}>
                  {saved ? <RefreshCw /> : <FileText />} {busy === periodIndex ? 'جاري التجهيز…' : saved ? 'تحديث التقرير' : `إنشاء تقرير ${kind === 'week' ? 'الأسبوع' : 'الشهر'} (PDF)`}
                </button>
                {saved && (
                  <button type="button" className="button secondary" disabled={busy !== null} onClick={() => void run(periodIndex, 'saved')}>
                    <Download /> تحميل النسخة المحفوظة
                  </button>
                )}
              </div>
              {inProgress && <p className="muted small">{label} لسه جاري، فالتقرير هيغطي الأيام اللي فاتت لحد النهارده.</p>}
            </Card>
          )
        })}
      </div>
      {rendering && (
        <ReportRenderer
          report={rendering}
          onDone={(problem) => {
            if (problem) setError(problem)
            setRendering(null)
            setBusy(null)
          }}
        />
      )}
    </div>
  )
}

/** Renders the report off-screen, exports it, then unmounts. */
function ReportRenderer({ report, onDone }: { report: ReportData; onDone: (error?: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      if (!ref.current) return
      exportReportPdf(ref.current, `menna-flow-${report.kind ?? 'month'}-${report.periodIndex}.pdf`).then(
        () => !cancelled && onDone(),
        (caught) => !cancelled && onDone(caught instanceof Error ? caught.message : 'تعذّر إنشاء ملف PDF'),
      )
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
    // Export once per report.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report])
  return createPortal(<div className="report-stage" aria-hidden="true"><ReportDocument ref={ref} report={report} /></div>, document.body)
}
