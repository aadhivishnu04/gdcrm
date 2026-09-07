import React, { useState, useEffect ,useRef} from 'react';
    import { 
        Search, MapPin, Calendar, Users,
        Pencil, Trash2, Save, X, ChevronDown,
        Plus, Target, MessageSquare, PlaneTakeoff, Phone, Eye,
        History, Briefcase, ClipboardList, Wallet, PackageCheck, ChevronRight
    } from 'lucide-react';
    import { apiFetch } from '../utils/api';

    // ─── UI HELPERS ──────────────────────────────────────────────────────────────

    const Modal = ({ open, onClose, title, children, maxWidth = "max-w-md" }) => {
        useEffect(() => {
            if (open) document.body.style.overflow = 'hidden';
            else document.body.style.overflow = '';
            return () => { document.body.style.overflow = ''; };
        }, [open]);
        
        if (!open) return null;
        
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className={`relative z-10 bg-[#1e293b] border border-slate-600 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col overflow-hidden`}>
                    
                    {/* Sticky Header */}
                    <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-700/50 bg-[#1e293b] z-20 flex-shrink-0">
                        <h3 className="text-lg sm:text-xl font-bold text-white truncate pr-4">{title}</h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0">
                            <X size={20} />
                        </button>
                    </div>
                    
                    {/* Scrollable Content */}
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-4 sm:p-6">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    const Field = ({ label, children, className = '' }) => (
        <div className={`mb-4 px-0.5 py-0.5 ${className}`}>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );

    const Input = ({ className = '', ...props }) => (
        <input
            className={`w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all ${className}`}
            {...props}
        />
    );

    const TextArea = ({ className = '', ...props }) => (
        <textarea
            className={`w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500
                focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all custom-scrollbar ${className}`}
            {...props}
        />
    );

    // ─── UPGRADED SELECT COMPONENT ──────────────────────────────────────────────
    const Select = ({ options, value, onChange, placeholder, className = '' }) => {
        const isCustomValue = value && value !== "" && !options.includes(value);
        const [isManual, setIsManual] = useState(isCustomValue);

        useEffect(() => {
            if (value && options.includes(value)) {
                setIsManual(false);
            } else if (value && !options.includes(value)) {
                setIsManual(true);
            }
        }, [value, options]);

        if (isManual) {
            return (
                <div className="flex items-center gap-1.5 w-full transition-all">
                    <input
                        type="text"
                        value={value || ''}
                        onChange={e => onChange(e.target.value)}
                        placeholder="Type custom entry..."
                        className={`w-full bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all flex-1 min-w-[80px] ${className}`}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setIsManual(false);
                            onChange(''); 
                        }}
                        className="flex items-center justify-center bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors flex-shrink-0 p-2 sm:p-2.5"
                        title="Cancel manual entry"
                    >
                        <X size={18} />
                    </button>
                </div>
            );
        }

        return (
            <div className="relative">
                <select
                    value={value || ''}
                    onChange={e => {
                        if (e.target.value === '__MANUAL__') {
                            setIsManual(true);
                            onChange('');
                        } else {
                            onChange(e.target.value);
                        }
                    }}
                    className={`w-full appearance-none bg-[#0f172a] border border-slate-600 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all cursor-pointer ${className}`}
                >
                {placeholder !== undefined && <option value="" disabled hidden>{placeholder}</option>}
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                    <option value="__MANUAL__" className="font-bold text-emerald-400 bg-slate-800">+ Add Manual / Other</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
        );
    };

    // ─── CONSTANTS ────────────────────────────────────────────────────────────────

 // ─── CONSTANTS & INITIAL STATE ────────────────────────────────────────────────

    const BUSINESS_TYPE_OPTIONS = ['Product', 'Service', 'Consultation', 'Wholesale', 'Retail', 'Other'];
    const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
    const LEAD_SOURCE_OPTIONS = ['Website', 'Google', 'Facebook', 'Instagram', 'WhatsApp', 'Referral', 'Phone', 'Walk-in', 'Other'];
    const LEAD_STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

    const PLATFORM_STYLES = {
        Website: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        Google: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        Facebook: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        Instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        WhatsApp: 'bg-green-500/10 text-green-400 border-green-500/20',
        Referral: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        Phone: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        'Walk-in': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        Other: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };

    const initialLeadState = {
        // Customer Information
        customerName: '',
        phone: '',
        email: '',
        companyName: '',
        
        // Business Requirement
        businessType: 'Product',
        requirement: '',
        budget: '',
        expectedPurchaseDate: '',
        priority: 'Medium',
        requirementDetails: '',
        
        // Lead Source
        leadSource: 'Website',
        sourceDetails: '',
        
        // Lead Management
        leadStatus: 'New',
        assignedTo: '',
        followupDate: '',
        notes: ''
    };

    // ─── LEAD JOURNEY / FULL HISTORY ENGINE ───────────────────────────────────────
    // Every lead is a single record enriched as it moves Sales → Operations →
    // Accounts → Fulfillment. This engine merges the explicit `history` log
    // (written mainly by Sales' own actions — assign, follow-up, outcome, etc.)
    // with a set of granular, auto-detected milestones for everything that
    // happens further down the pipeline (Operations, Accounts, Fulfillment),
    // so the "Full Journey" reads as one continuous, chronological story —
    // matching the Lead Assigned → ... → Trip Completed flow.

    const safeParseHistory = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch (e) { return []; }
    };

    const safeParseArr = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch (e) { return []; }
    };

    const fmtDate = (val) => {
        if (!val) return null;
        const d = new Date(val);
        if (isNaN(d.getTime())) return typeof val === 'string' ? val : null;
        return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // Splits a "Label: Value" style string into { label, value } so the label can
    // render in plain bold text and the dynamic value can render highlighted,
    // same as the DD_Month_YYYY mockups (black label, red dynamic value).
    const splitLabelValue = (text) => {
        if (!text) return null;
        const idx = text.indexOf(':');
        if (idx === -1) return { label: text.trim(), value: null };
        return { label: text.slice(0, idx).trim(), value: text.slice(idx + 1).trim() };
    };

    // Stage config used for the "Complete Record by Stage" accordion below the
    // timeline (kept from the original implementation).
    const STAGE_CONFIG = [
        { key: 'lead', label: 'Lead Captured', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', icon: Target },
        { key: 'sales', label: 'Sales', color: 'text-white-400 bg-purple-500/10 border-purple-500/20', icon: Briefcase },
        { key: 'operations', label: 'Operations', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: ClipboardList },
        { key: 'accounts', label: 'Accounts / Billing', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Wallet },
        { key: 'fulfillment', label: 'Fulfillment', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: PackageCheck },
    ];

    // Classifies one raw `history` log entry (written by SalesDashboard's
    // appendHistory()) into the exact mockup step titles: Lead Assigned,
    // Lead Response Status, Lead Response Status - Requirement Collected,
    // Readymade Shared - Followup, Sales Followup. Returns null for entries
    // that don't correspond to a Full Journey row (e.g. "Lead Created", which
    // feeds the header's "Lead Created" date instead).
    const classifySalesEntry = (h, lead) => {
        const action = h.action || '';
        const note = h.note || '';

        if (/^Lead Created$/i.test(action)) return null;
        if (/^Auto-Moved to Recycle Bin$/i.test(action) || /^Archived Cycle:/i.test(action)) return null;

        // Lead Assigned
        const assignMatch = action.match(/^(?:Recovered & )?Assigned to (.+)$/i);
        if (assignMatch) {
            return { title: 'Lead Assigned', parts: [{ label: 'Assigned by', value: assignMatch[1].trim() }] };
        }

        // Follow-up (before Requirement Collected) → Lead Response Status
        const fu = action.match(/^Follow-up:\s*(.*)$/i);
        if (fu) {
            return {
                title: 'Lead Response Status',
                parts: [
                    { label: 'Interaction Type', value: fu[1] },
                    { label: 'Action Taken', value: note },
                ],
            };
        }

        // Outcome Update (after Requirement Collected) → Readymade Shared -
        // Followup / Sales Followup, both rendered as "Sales Track -
        // Customer Response | Next Followup: Date"
        const ou = action.match(/^Outcome Update:\s*(.*)$/i);
        if (ou) {
            const title = /readymade/i.test(note) ? 'Readymade Shared - Followup' : 'Sales Followup';
            return {
                title,
                parts: [
                    { label: 'Sales Track - Customer Response', value: note },
                    lead.nextFollowUpDatePostponed ? { label: 'Next Followup', value: lead.nextFollowUpDatePostponed } : null,
                ],
            };
        }

        // Lead Profile Updated → only surfaced when it captures Requirement
        // Collected (readymade / customisation), matching the mockup's
        // "Lead Response Status - Requirement Collected" rows
        if (/^Lead Profile Updated$/i.test(action)) {
            const stageMatch = note.match(/Stage:\s*([^|]+)/i);
            const stage = stageMatch ? stageMatch[1].trim() : '';
            if (/Requirement Collected/i.test(stage)) {
                const actionTaken = lead.actionTaken || '';
                const suffix = /readymade/i.test(actionTaken) ? ' (Readymade Shared)' : /customisation/i.test(actionTaken) ? ' (Customisation Required)' : '';
                return {
                    title: 'Lead Response Status - Requirement Collected',
                    parts: [
                        { label: 'Interaction Type', value: lead.interactionType },
                        { label: 'Travel Details - Action Taken', value: `${actionTaken}${suffix}` },
                    ],
                };
            }
            return null;
        }

        // Anything else (housekeeping edits, status touch-ups, etc.) isn't part
        // of the curated Full Journey — skip it instead of cluttering the view.
        return null;
    };

    // Reads the *real* accounts data that AccountsDashboard actually saves onto
    // the lead record. AccountsDashboard never writes flat fields like
    // amountReceived / paymentMode / transactionId onto the lead — it stores a
    // paymentHistoryDetails[] transaction log (customer side) and a
    // paymentRequests[] log (vendor side), and computes totals like
    // "totalReceived" on the fly from those arrays. Without this, any code that
    // reads lead.amountReceived etc. directly (as this file used to) always
    // reads undefined, even though AccountsDashboard clearly shows payments.
    // This derives the same flat summary fields from those arrays, plus a
    // couple of naming fallbacks AccountsDashboard itself uses
    // (gstInclusion/tcsInclusion, operationExecutive) but this file didn't.
    const deriveAccountsData = (lead) => {
        if (!lead) return {};

        const txns = safeParseArr(lead.paymentHistoryDetails);
        const verifiedTxns = txns.filter(t => t.verified);
        const countedTxns = verifiedTxns.length ? verifiedTxns : txns;

        const amountReceived = countedTxns.reduce(
            (sum, t) => sum + (Number(String(t.amount).replace(/[^0-9.-]+/g, '')) || 0), 0
        );
        const lastTxn = countedTxns[countedTxns.length - 1];

        const totalPackageCost = lead.totalPackageCost || lead.packageCost || lead.budget || lead.amount;
        const packageCostNum = Number(String(totalPackageCost || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const balancePending = (lead.balancePending !== undefined && lead.balancePending !== null && lead.balancePending !== '')
            ? lead.balancePending
            : (packageCostNum ? Math.max(packageCostNum - amountReceived, 0) : undefined);

        const vendorReqs = safeParseArr(lead.paymentRequests);
        const vendorPaid = vendorReqs.filter(r => r.status === 'Paid' || r.paymentStatus === 'Paid' || r.outAmountPaid);
        const vendorPaymentSummary = vendorReqs.length
            ? `${vendorPaid.length}/${vendorReqs.length} vendor payments completed`
            : undefined;

        const derivedAmountReceived = lead.amountReceived || (amountReceived || undefined);

        return {
            amountReceived: derivedAmountReceived,
            paymentMode: lead.paymentMode || lastTxn?.mode,
            transactionId: lead.transactionId || lastTxn?.transactionId,
            nextPaymentDate: lead.nextPaymentDate,
            balancePending,
            totalPackageCost,
            operationsExecutive: lead.operationsExecutive || lead.operationExecutive || lead.assignedTo,
            gstStatus: lead.gstStatus || lead.gstInclusion,
            tcsStatus: lead.tcsStatus || lead.tcsInclusion,
            confirmedDate: lead.confirmedDate || lead.bookingDate,
            confirmedDestination: lead.confirmedDestination || lead.destination,
            confirmedNoOfPax: lead.confirmedNoOfPax || lead.noOfPax || lead.pax,
            vendorPaymentSummary,
            paymentStatus: lead.paymentStatus || (packageCostNum && derivedAmountReceived >= packageCostNum && packageCostNum ? 'Fully Paid' : (derivedAmountReceived ? 'Partially Paid' : undefined)),
        };
    };

    // Builds the full, oldest → newest chronological journey for one lead.
    //
    // Sales-side granularity (assign / follow-up / outcome / readymade / etc.)
    // already comes for free from the explicit `history` log written by
    // SalesDashboard's own appendHistory() calls — it is pushed newest-first, so
    // we simply reverse it to read oldest-first, exactly like the mockup, then
    // classify each entry into the exact mockup step title.
    //
    // Everything after "Sent To Operations" is synthesized from the fields each
    // downstream dashboard (Operations/Accounts/Fulfillment) already saves onto
    // the lead record, in pipeline order, so nothing needs to change in those
    // files for the journey to stay accurate as those forms are filled in.
    const buildLeadTimeline = (lead) => {
        if (!lead) return [];

        // Parses any raw date value into a sortable timestamp, or null if it
        // can't be trusted — used to merge explicit + synthesized entries into
        // one real chronological sequence instead of two stacked blocks.
        const toTs = (val) => {
            if (!val) return null;
            const t = new Date(val).getTime();
            return isNaN(t) ? null : t;
        };

        // 1) Sales-side explicit log — oldest first, classified into mockup titles
        const explicit = safeParseHistory(lead.history).slice().reverse().map(h => {
            const classified = classifySalesEntry(h, lead);
            if (!classified) return null;
            return {
                date: fmtDate(h.date) || h.date || 'Recorded',
                _ts: toTs(h.date),
                stage: 'sales',
                title: classified.title,
                parts: (classified.parts || []).filter(p => p && (p.value || p.label)),
                _explicit: true,
            };
        }).filter(Boolean);

        const synthesized = [];
        const push = (stage, title, dateVal, parts) => synthesized.push({
            date: fmtDate(dateVal) || 'Recorded',
            _ts: toTs(dateVal),
            stage, title,
            parts: (parts || []).filter(p => p && (p.value || p.label)),
            _explicit: false,
        });

        // 2) Sent to Operations
        const custReqs = safeParseArr(lead.customisationRequests);
        if (lead.status === 'Move To Operation' || lead.sentToOperationsDate || custReqs.length) {
            const destinations = custReqs.map(r => r.destination || r.destinationRequest).filter(Boolean).join(', ')
                || lead.destinationRequest || lead.destination;
            push('operations', 'Sent To Operations', lead.sentToOperationsDate || lead.movedToOpsDate, [
                { label: 'Destination', value: destinations || 'N/A' }
            ]);
        }

        // 3) Ops assignment / per-destination work updates (repeats — one per
        // customisation request / vendor destination touched by Operations)
        custReqs.forEach(req => {
            if (req.opsCustomisationStatus || req.workType || req.opsAssignedBy) {
                push('operations', req.opsAssignedBy ? `Assigned By ${req.opsAssignedBy}` : 'Operations Update', req.opsExpectedCompletionDate, [
                    { label: 'Destination', value: req.destination || req.destinationRequest || lead.destination },
                    { label: 'Work Type', value: req.workType },
                    { label: 'Customisation Status', value: req.opsCustomisationStatus },
                    req.operationsExecutive ? { label: null, value: req.operationsExecutive } : null,
                ]);
            }
        });
        if (lead.opsPreparedBy && custReqs.length === 0) {
            push('operations', `Assigned By ${lead.opsPreparedBy}`, lead.opsCompletedOn, [
                { label: 'Destination', value: lead.destinationRequest || lead.destination },
                { label: 'Customisation Status', value: lead.opsCustomisationStatus },
            ]);
        }

        // 4) Back to Sales Board
        if (lead.sharedWithSales) {
            push('operations', 'Back to Sales Board', lead.sharedWithSalesDate, [
                { label: 'Destination shared by ops', value: lead.destinationRequest || lead.destination }
            ]);
        }

        // 5) Sales follow-up after itinerary return (customer response / booking confirmed)
        if (lead.customerResponse) {
            push('sales', 'Sales Followup', lead.confirmedDate || lead.lastFollowUpDate, [
                { label: 'Sales Track - Customer Response', value: lead.customerResponse },
                lead.nextFollowUpDatePostponed ? { label: 'Next Followup', value: lead.nextFollowUpDatePostponed } : null,
            ]);
        }
        if (lead.customerResponse === 'Booking Confirmed') {
            push('sales', 'Sales Followup', lead.confirmedDate, [
                { label: 'Booking Confirmed | Next Followup', value: lead.nextFollowUpDatePostponed || lead.confirmedDate }
            ]);
            push('accounts', 'Moved to All Confirmation Boards', lead.confirmedDate, []);
        }

        // 6) Accounts — payment stages. AccountsDashboard saves real payment
        // data into paymentHistoryDetails[] (customer) / paymentRequests[]
        // (vendor) rather than flat fields, so read those directly here instead
        // of the (usually empty) lead.amountReceived / lead.paymentMode etc.
        const acct = deriveAccountsData(lead);
        const custTxns = safeParseArr(lead.paymentHistoryDetails);
        if (custTxns.length) {
            custTxns.forEach(t => {
                push('accounts', 'Customer Payment', t.date, [
                    { label: 'Service', value: t.service },
                    { label: 'Payment', value: t.mode ? `${t.mode} • ₹${t.amount || 0}${t.transactionId ? ` (${t.transactionId})` : ''}` : `₹${t.amount || 0} received` },
                    { label: 'Status', value: t.verified ? 'Verified' : 'Pending Verification' },
                ]);
            });
        } else if (acct.amountReceived || acct.paymentStatus) {
            push('accounts', 'Customer Payment', acct.nextPaymentDate || acct.confirmedDate, [
                { label: 'Payment Stage', value: acct.paymentMode ? `${acct.paymentMode} • ₹${acct.amountReceived || 0} received` : `₹${acct.amountReceived || 0} received` }
            ]);
        }
        if (acct.paymentStatus === 'Fully Paid' || (acct.balancePending !== undefined && Number(acct.balancePending) === 0 && acct.amountReceived)) {
            push('accounts', 'Customer Payment', lead.fullyPaidDate || acct.nextPaymentDate, [
                { label: 'Payment Stage', value: 'Fully Paid' }
            ]);
        }
        // Vendor-side payments (Accounts' "Vendor Payment" tab) — one row per
        // vendor request that's actually been paid out.
        safeParseArr(lead.paymentRequests).forEach(req => {
            if (req.status === 'Paid' || req.paymentStatus === 'Paid' || req.outAmountPaid) {
                push('accounts', 'Vendor Payment', req.paymentDueDate, [
                    { label: 'Vendor', value: req.outProviderName || req.providerName || req.service },
                    { label: 'Paid', value: req.outAmountPaid ? `₹${req.outAmountPaid}${req.outTransactionId ? ` (${req.outTransactionId})` : ''}` : 'Paid' },
                ]);
            }
        });

        // 7) Fulfillment — briefing, vendor payment, travel ready, trip completed
        if (lead.briefingDateVal || lead.briefedByVal) {
            push('fulfillment', 'Briefing Completed', lead.briefingDateVal, [
                { label: 'by', value: lead.briefedByVal }
            ]);
        }
        if (lead.vendorPayStatus === 'Paid' || lead.vendorPayStatus === 'Completed' || lead.clrFinSupplier) {
            push('fulfillment', 'Vendor Payment Completed', lead.briefingDateVal, []);
        }
        if (lead.clrReadyDeparture) {
            push('fulfillment', 'Travel Ready', lead.tourStartDate || lead.travelDate || lead.travelDates, [
                { label: 'Travel Date', value: lead.tourStartDate || lead.travelDate || lead.travelDates }
            ]);
        }
        if (lead.status === 'Trip Completed' || lead.reviewStatus) {
            push('fulfillment', 'Trip Completed', lead.returnDate || lead.travelDates, [
                { label: 'Review Status', value: lead.reviewStatus || 'Pending Review' }
            ]);
        }

        // Merge into one true chronological story. Entries with a real
        // timestamp are ordered by when they actually happened; entries
        // without one (rare) keep their natural pipeline position via a
        // stable sort, so nothing jumps around unpredictably.
        return [...explicit, ...synthesized].sort((a, b) => {
            if (a._ts != null && b._ts != null) return a._ts - b._ts;
            return 0; // unknown timestamps: preserve original (pipeline) order
        });
    };

    // Curated per-stage field maps so the "Complete Record" section can show
    // every populated data point captured about the lead at each stage.
    const STAGE_FIELD_MAPS = {
        sales: [
            ['assignedTo', 'Assigned Executive'], ['status', 'Pipeline Status'], ['actionTaken', 'Action Taken'],
            ['leadResponse', 'Lead Response'], ['interactionType', 'Interaction Type'], ['firstAttempt', 'First Attempt'],
            ['customerResponse', 'Customer Response'], ['followUpCount', 'Follow-ups Logged'], ['salesRemarks', 'Sales Remarks'],
        ],
        operations: [
            ['opsPreparedBy', 'Prepared By'], ['finalStatus', 'Final Status'], ['workType', 'Work Type'],
            ['destinationRequest', 'Destination Request'], ['packageCost', 'Package Cost'], ['itineraryPrepDate', 'Itinerary Prep Date'],
            ['itineraryVersion', 'Itinerary Version'], ['vendorName', 'Vendor Name'], ['vendorService', 'Vendor Service'],
            ['vendorMessage', 'Vendor Message'], ['documentStatus', 'Document Status'], ['qcStatus', 'QC Status'],
            ['qcDate', 'QC Date'], ['qcRemarks', 'QC Remarks'], ['bookingDate', 'Booking Date'], ['confirmationDate', 'Confirmation Date'],
        ],
        accounts: [
            ['operationsExecutive', 'Operations Executive'], ['totalPackageCost', 'Total Package Cost'], ['amountReceived', 'Amount Received'],
            ['balancePending', 'Balance Pending'], ['nextPaymentDate', 'Next Payment Date'], ['paymentMode', 'Payment Mode'],
            ['transactionId', 'Transaction ID'], ['gstStatus', 'GST Status'], ['tcsStatus', 'TCS Status'], ['confirmedDate', 'Confirmed Date'],
            ['confirmedDestination', 'Confirmed Destination'], ['confirmedNoOfPax', 'Confirmed Pax'],
            ['vendorPaymentSummary', 'Vendor Payments'],
        ],
        fulfillment: [
            ['briefedByVal', 'Briefed By'], ['briefingDateVal', 'Briefing Date'], ['briefedMethodVal', 'Briefing Method'],
            ['dmcConfReceived', 'DMC Confirmation'], ['flightTicketVerified', 'Flight Ticket Verified'], ['domTicketVerified', 'Domestic Ticket Verified'],
            ['clrOpsDocs', 'Docs Cleared'], ['clrOpsServices', 'Services Cleared'], ['clrFinPayment', 'Finance Cleared'],
            ['clrMgrReview', 'Manager Reviewed'], ['clrReadyDeparture', 'Ready for Departure'], ['vendorPayStatus', 'Vendor Payment Status'],
        ],
    };

    const hasAnyStageData = (lead, key) => STAGE_FIELD_MAPS[key].some(([field]) => {
        const v = lead[field];
        return v !== undefined && v !== null && v !== '' && v !== false;
    });

    // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

    const LeadsManager = () => {
        const [leads, setLeads] = useState([]);
        const [campaignOptions, setCampaignOptions] = useState([]);
        const [searchQuery, setSearchQuery] = useState('');
        const [isLoading, setIsLoading] = useState(true);
        
        // Edit/Add Modal State
        const [leadModalOpen, setLeadModalOpen] = useState(false);
        const [editingId, setEditingId] = useState(null);
        const [leadForm, setLeadForm] = useState(initialLeadState);

        // View Modal State
        const [viewModalOpen, setViewModalOpen] = useState(false);
        const [viewingLead, setViewingLead] = useState(null);

        // History Modal State
        const [historyModalOpen, setHistoryModalOpen] = useState(false);
        const [historyLead, setHistoryLead] = useState(null);
        const [expandedStage, setExpandedStage] = useState(null);
        // Add this ref for the date picker
        const dateInputRef = useRef(null);

        // ── FETCH LEADS & CAMPAIGNS ────────────────────────────────────────────────
        useEffect(() => {
            const fetchInitialData = async () => {
                try {
                    const leadsData = await apiFetch('/leads');
                    setLeads(leadsData);
                } catch (err) {
                    console.error("Failed to fetch leads:", err);
                } finally {
                    setIsLoading(false);
                }

                // Campaigns is restricted to Admin/Director/Marketing on the backend —
                // handled separately so a 403 here (expected for Sales/Ops/Accounts
                // users) never blocks the leads list above from loading.
                try {
                    const campaignData = await apiFetch('/campaigns');
                    if (Array.isArray(campaignData)) {
                        setCampaignOptions(campaignData.map(c => c.name));
                    }
                } catch (err) {
                    console.warn("Campaign options unavailable for this role:", err.message);
                }
            };
            fetchInitialData();
        }, []);

        // ── MODAL HELPERS ──────────────────────────────────────────────────────────
        const openAddModal = () => {
            setLeadForm(initialLeadState);
            setEditingId(null);
            setLeadModalOpen(true);
        };
 const openEditModal = (lead) => {
        setLeadForm({
            customerName: lead.customerName || '',
            phone: lead.phone || '',
            email: lead.email || '',
            companyName: lead.companyName || '',
            businessType: lead.businessType || 'Product',
            requirement: lead.requirement || '',
            budget: lead.budget || lead.budgetRange || '',
            expectedPurchaseDate: lead.expectedPurchaseDate || '',
            priority: lead.priority || 'Medium',
            requirementDetails: lead.requirementDetails || lead.leadMessage || '',
            leadSource: lead.leadSource || lead.platform || 'Website',
            sourceDetails: lead.sourceDetails || '',
            leadStatus: lead.leadStatus || lead.status || 'New',
            assignedTo: lead.assignedTo || '',
            followupDate: lead.followupDate || '',
            notes: lead.notes || ''
        });
        setEditingId(lead.id);
        setLeadModalOpen(true);
    };

        const openViewModal = (lead) => {
            setViewingLead(lead);
            setViewModalOpen(true);
        };

        const closeModal = () => {
            setLeadModalOpen(false);
            setEditingId(null);
        };

        const closeViewModal = () => {
            setViewModalOpen(false);
            setViewingLead(null);
        };

        const openHistoryModal = (lead) => {
            setHistoryLead(lead);
            setExpandedStage(null);
            setHistoryModalOpen(true);
        };

        const closeHistoryModal = () => {
            setHistoryModalOpen(false);
            setHistoryLead(null);
        };

        // ── SAVE (CREATE / UPDATE) ─────────────────────────────────────────────────
        const saveLead = async () => {
            try {
                const isEditing = Boolean(editingId);
                const path = isEditing ? `/leads/${editingId}` : `/leads`;
                const method = isEditing ? 'PUT' : 'POST';

                const existingLead = isEditing ? leads.find(l => l.id === editingId) : null;

                // Mapping state to Prisma Backend expectations explicitly
                const payload = {
                    ...leadForm,
                    noOfPax: leadForm.pax,
                    noOfChildren: leadForm.childrenPax, 
                    budgetRange: leadForm.budget,
                    status: isEditing ? (existingLead?.status || 'Jobs') : 'Jobs'
                };

                const saved = await apiFetch(path, {
                    method,
                    body: JSON.stringify(payload)
                });

                setLeads(prev => isEditing ? prev.map(l => l.id === editingId ? saved : l) : [saved, ...prev]);

                // Trigger email alert for NEW leads directly
                if (!isEditing) {
                    console.log("Triggering email alert to backend...");

                    apiFetch('/notifications/new-lead', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            leadId: saved.id,
                            customerName: saved.customerName,
                            destination: saved.destination,
                            email: saved.email,
                            phone: saved.phone
                        })
                    })
                    .then(data => console.log("Email server response:", data))
                    .catch(err => console.error("Silently failing email trigger:", err));
                }

                closeModal();
            } catch (err) {
                console.error("Network Error Details:", err);
                const message = err.status === 0
                    ? 'Error connecting to the server. Check if your backend service is running.'
                    : (err.message || 'Check backend terminal configurations.');
                alert(`Failed to save lead: ${message}`);
            }
        };

        // ── DELETE ─────────────────────────────────────────────────────────────────
        const deleteLead = async (id) => {
            if (!window.confirm("Are you sure you want to delete this lead?")) return;
            try {
                await apiFetch(`/leads/${id}`, { method: 'DELETE' });
                setLeads(prev => prev.filter(l => l.id !== id));
            } catch (err) {
                console.error(err);
                const message = err.status === 0
                    ? 'Error connecting to the server.'
                    : (err.message || 'Failed to delete lead.');
                alert(message);
            }
        };

        // ── FILTER ─────────────────────────────────────────────────────────────────
        const filteredLeads = leads.filter(lead => {
            const query = searchQuery.toLowerCase();
            const displayId = `LMN${lead.id || ''}`.toLowerCase();
            const historicalId = (lead.jobId || '').toLowerCase();

            return (
                displayId.includes(query) ||
                historicalId.includes(query) ||
                (lead.customerName || '').toLowerCase().includes(query) ||
                (lead.destination || '').toLowerCase().includes(query) ||
                (lead.phone || '').includes(searchQuery) ||
                (lead.platform || '').toLowerCase().includes(query) ||
                (lead.campaign || '').toLowerCase().includes(query)
            );
        });

        return (
            <div className="bg-[#0f172a] min-h-screen w-full p-3 sm:p-4 lg:p-6 pt-20 sm:pt-24 lg:pt-24 space-y-4 sm:space-y-6 text-white text-base overflow-x-hidden">

                {/* ── HEADER ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 sm:p-5 lg:p-6 rounded-xl border border-slate-700 shadow-sm bg-slate-900/50">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 tracking-tight">
                            <Users className="text-emerald-400" /> Leads Manager
                        </h1>
                        {/* <p className="text-sm sm:text-base text-slate-400 mt-1 sm:mt-1.5">View, search, edit, and manage all your customer travel inquiries.</p> */}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto mt-2 md:mt-0">
                        <div className="w-full md:w-72 lg:w-80 relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search name, job ID..."
                                className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
                            />
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>
                        <button onClick={openAddModal} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-bold transition-colors shadow-lg shadow-emerald-500/20 whitespace-nowrap">
                            <Plus size={18} strokeWidth={2.5} /> New Lead
                        </button>
                    </div>
                </div>

                {/* ── TABLE / MOBILE & TABLET CARDS ── */}
                <div className="bg-transparent lg:bg-slate-900/50 lg:border border-slate-700/50 rounded-xl shadow-sm overflow-hidden">
                    <div className="w-full custom-scrollbar">
                        <table className="w-full text-left text-sm sm:text-base text-slate-300 block lg:table">
                         {/* ── TABLE HEADERS ── */}
<thead className="text-xs uppercase tracking-wider text-slate-400 font-semibold bg-transparent border-b border-slate-700/50 hidden lg:table-header-group">
    <tr>
        <th className="px-6 py-4 whitespace-nowrap">Job ID</th>
        <th className="px-6 py-4 whitespace-nowrap">Customer Info</th>
        <th className="px-6 py-4 whitespace-nowrap">Business Requirement</th>
        <th className="px-6 py-4 whitespace-nowrap">Requirement & Budget</th>
        <th className="px-6 py-4 whitespace-nowrap">Details & Notes</th>
        <th className="px-6 py-4 whitespace-nowrap">Source</th>
        <th className="px-6 py-4 whitespace-nowrap">Date Added</th>
        <th className="px-6 py-4 text-center whitespace-nowrap">Actions</th>
    </tr>
</thead>
<tbody className="block lg:table-row-group divide-y-0 lg:divide-y divide-slate-700/30">
    {isLoading ? (
        <tr className="block lg:table-row">
            <td colSpan="8" className="block lg:table-cell text-center py-12 text-slate-500">Loading your leads...</td>
        </tr>
    ) : filteredLeads.length === 0 ? (
        <tr className="block lg:table-row">
            <td colSpan="8" className="block lg:table-cell text-center py-12 text-slate-500">No leads found.</td>
        </tr>
    ) : (
        filteredLeads.map(lead => (
            <tr key={lead.id} className="block lg:table-row bg-[#132033] lg:bg-transparent border border-[#1e3a52] lg:border-none rounded-xl mb-4 lg:mb-0 p-3 lg:p-0 hover:bg-slate-800/40 transition-colors group shadow-sm lg:shadow-none">
                
                {/* Job ID */}
                <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none font-medium text-slate-200">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Job ID</span>
                    <span className="text-right lg:text-left">LMN{lead.id}</span>
                </td>
                
                {/* Customer Info */}
                <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Customer</span>
                    <div className="text-right lg:text-left">
                        <div className="font-bold text-white text-sm sm:text-base leading-none mb-1.5">
                            {lead.customerName || 'N/A'}
                        </div>
                        <div className="flex flex-col lg:items-start items-end gap-0.5 text-xs sm:text-sm text-slate-400">
                            <span className="flex items-center gap-1"><Phone size={13} className="flex-shrink-0" /> {lead.phone}</span>
                            {lead.companyName && <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">{lead.companyName}</span>}
                        </div>
                    </div>
                </td>
                
                {/* Business Requirement */}
                <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Business Requirement</span>
                    <div className="text-right lg:text-left">
                        <div className="font-semibold text-emerald-400 flex items-center justify-end lg:justify-start gap-1.5 mb-1 text-sm sm:text-base">
                            <span>{lead.businessType || 'Product'}</span>
                        </div>
                        <div className="flex flex-col lg:items-start items-end gap-1 text-[11px] sm:text-xs text-slate-400">
                            <span className="text-slate-300 font-medium">{lead.requirement || 'N/A'}</span>
                            <span className="text-slate-500">Priority: <strong className="text-slate-300">{lead.priority || 'Medium'}</strong></span>
                        </div>
                    </div>
                </td>
                
                {/* Requirement & Budget */}
                <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requirement & Budget</span>
                    <div className="flex flex-col gap-1.5 items-end lg:items-start">
                        <span className="font-semibold text-slate-200 text-xs sm:text-sm">
                            {lead.budget ? `₹${Number(lead.budget).toLocaleString('en-IN')}` : 'Budget not set'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                            Expected: {lead.expectedPurchaseDate || 'TBD'}
                        </span>
                    </div>
                </td>
                
                {/* Details & Notes */}
                <td className="flex flex-col lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none text-xs sm:text-sm text-slate-400">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Details & Notes</span>
                    <div className="max-w-full lg:max-w-[200px] flex flex-col gap-1">
                        <p className="truncate" title={lead.requirementDetails || lead.notes}>
                            {lead.requirementDetails || lead.notes || '— No notes'}
                        </p>
                    </div>
                </td>
                
                {/* Source */}
                <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Source</span>
                    <div className="text-right lg:text-left flex flex-col items-end lg:items-start">
                        {lead.leadSource || lead.platform ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                {lead.leadSource || lead.platform}
                            </span>
                        ) : (
                            <span className="text-slate-600">—</span>
                        )}
                        {lead.sourceDetails && (
                            <div className="text-[10px] sm:text-xs text-slate-500 mt-1 truncate max-w-[120px]" title={lead.sourceDetails}>
                                {lead.sourceDetails}
                            </div>
                        )}
                    </div>
                </td>
                
                {/* Date Added */}
                <td className="flex justify-between items-start lg:items-center lg:table-cell py-2.5 lg:py-4 px-3 lg:px-6 border-b border-slate-700/30 lg:border-none text-slate-400 text-xs sm:text-sm font-medium">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date Added</span>
                    <span className="text-right lg:text-left">
                        {lead.createdAt
                            ? new Date(lead.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'N/A'}
                    </span>
                </td>
                
                {/* Actions */}
                <td className="flex justify-between items-center lg:table-cell py-3 lg:py-4 px-3 lg:px-6 lg:text-center mt-1 lg:mt-0">
                    <span className="lg:hidden text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</span>
                    <div className="flex items-center justify-end lg:justify-center gap-1.5 sm:gap-2">
                        <button onClick={() => openViewModal(lead)}
                            className="p-2 lg:p-1.5 text-blue-400 lg:text-slate-400 bg-blue-500/10 lg:bg-transparent hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="View Lead">
                            <Eye size={18} />
                        </button>
                        <button onClick={() => openHistoryModal(lead)}
                            className="p-2 lg:p-1.5 text-purple-400 lg:text-slate-400 bg-purple-500/10 lg:bg-transparent hover:text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors"
                            title="Lead History">
                            <History size={18} />
                        </button>
                        <button onClick={() => openEditModal(lead)}
                            className="p-2 lg:p-1.5 text-yellow-400 lg:text-slate-400 bg-yellow-500/10 lg:bg-transparent hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition-colors"
                            title="Edit Lead">
                            <Pencil size={18} />
                        </button>
                        <button onClick={() => deleteLead(lead.id)}
                            className="p-2 lg:p-1.5 text-rose-400 lg:text-slate-400 bg-rose-500/10 lg:bg-transparent hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete Lead">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </td>
            </tr>
        ))
    )}
</tbody>
                        </table>
                    </div>
                </div>
                                
                {/* ── ADD/EDIT LEAD MODAL ── */}
               {/* ── ADD/EDIT LEAD MODAL ── */}
                <Modal open={leadModalOpen} onClose={closeModal} title={editingId ? `Edit Lead (LMN${editingId})` : "Add New Lead"} maxWidth="max-w-4xl">
                    <div className="space-y-6">
                        
                        {/* 1. CUSTOMER INFORMATION */}
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-300 border-b border-slate-700/50 pb-2 mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                <Users size={16} className="text-violet-400" /> Customer Information
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <Field label="Customer Name">
                                    <Input 
                                        value={leadForm.customerName} 
                                        onChange={e => setLeadForm({ ...leadForm, customerName: e.target.value })} 
                                        autoFocus 
                                    />
                                </Field>
                                <Field label="Mobile Number">
                                    <Input 
                                        type="tel" 
                                        value={leadForm.phone} 
                                        onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} 
                                    />
                                </Field>
                                <Field label="Email Address">
                                    <Input 
                                        type="email" 
                                        value={leadForm.email} 
                                        onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} 
                                    />
                                </Field>
                                <Field label="Company Name (Optional)">
                                    <Input 
                                        value={leadForm.companyName} 
                                        onChange={e => setLeadForm({ ...leadForm, companyName: e.target.value })} 
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* 2. BUSINESS REQUIREMENT */}
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-300 border-b border-slate-700/50 pb-2 mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                <MapPin size={16} className="text-emerald-400" /> Business Requirement
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <Field label="Business Type">
                                    <Select 
                                        options={BUSINESS_TYPE_OPTIONS} 
                                        value={leadForm.businessType} 
                                        onChange={v => setLeadForm({ ...leadForm, businessType: v })} 
                                    />
                                </Field>
                                <Field label="Requirement / Product">
                                    <Input 
                                        value={leadForm.requirement} 
                                        onChange={e => setLeadForm({ ...leadForm, requirement: e.target.value })} 
                                    />
                                </Field>
                                <Field label="Budget">
                                    <Input 
                                        type="number" 
                                        min="0"
                                        value={leadForm.budget} 
                                        onChange={e => setLeadForm({ ...leadForm, budget: e.target.value })} 
                                    />
                                </Field>
                                <Field label="Expected Purchase Date">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="date"
                                            ref={dateInputRef}
                                            value={leadForm.expectedPurchaseDate} 
                                            onChange={e => setLeadForm({ ...leadForm, expectedPurchaseDate: e.target.value })} 
                                            onClick={() => {
                                                if (dateInputRef.current) {
                                                    try { dateInputRef.current.showPicker(); } catch (err) {}
                                                }
                                            }}
                                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-3 pr-10 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
                                        />
                                        <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center justify-center">
                                            <Calendar size={18} />
                                        </div>
                                    </div>
                                </Field>
                                <Field label="Priority">
                                    <Select 
                                        options={PRIORITY_OPTIONS} 
                                        value={leadForm.priority} 
                                        onChange={v => setLeadForm({ ...leadForm, priority: v })} 
                                    />
                                </Field>
                                <Field label="Requirement Details" className="md:col-span-3">
                                    <Input 
                                        value={leadForm.requirementDetails} 
                                        onChange={e => setLeadForm({ ...leadForm, requirementDetails: e.target.value })} 
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* 3. LEAD SOURCE */}
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-300 border-b border-slate-700/50 pb-2 mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                <Target size={16} className="text-blue-400" /> Lead Source
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <Field label="Lead Source">
                                    <Select 
                                        options={LEAD_SOURCE_OPTIONS} 
                                        value={leadForm.leadSource} 
                                        onChange={v => setLeadForm({ ...leadForm, leadSource: v })} 
                                    />
                                </Field>
                                <Field label="Source Details (Optional)" className="md:col-span-3">
                                    <Input 
                                        value={leadForm.sourceDetails} 
                                        onChange={e => setLeadForm({ ...leadForm, sourceDetails: e.target.value })} 
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* 4. LEAD MANAGEMENT */}
                        <div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-300 border-b border-slate-700/50 pb-2 mb-3 sm:mb-4 flex items-center gap-2 uppercase tracking-widest text-xs">
                                <ClipboardList size={16} className="text-amber-400" /> Lead Management
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                <Field label="Lead Status">
                                    <Select 
                                        options={LEAD_STATUS_OPTIONS} 
                                        value={leadForm.leadStatus} 
                                        onChange={v => setLeadForm({ ...leadForm, leadStatus: v })} 
                                    />
                                </Field>
                                <Field label="Assigned To">
                                    {/* Assumes campaignOptions or another member list is available; fallback to manual input if needed */}
                                    <Input 
                                        value={leadForm.assignedTo} 
                                        onChange={e => setLeadForm({ ...leadForm, assignedTo: e.target.value })} 
                                    />
                                </Field>
                                <Field label="Follow-up Date">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="date"
                                            value={leadForm.followupDate} 
                                            onChange={e => setLeadForm({ ...leadForm, followupDate: e.target.value })} 
                                            className="w-full bg-[#0f172a] border border-slate-600 rounded-lg pl-3 pr-10 py-2 sm:py-2.5 text-sm sm:text-base text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all cursor-pointer"
                                        />
                                    </div>
                                </Field>
                            </div>
                            <Field label="Notes" className="mb-0 mt-2">
                                <TextArea 
                                    rows="3" 
                                    value={leadForm.notes} 
                                    onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })} 
                                />
                            </Field>
                        </div>

                    </div>

                    {/* Sticky Footer */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-5 border-t border-slate-700/50 mt-6 sticky -bottom-6 bg-[#1e293b] pb-6 sm:pb-0 z-20">
                        <button onClick={closeModal} className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm sm:text-base font-semibold transition-colors order-2 sm:order-1">
                            Cancel
                        </button>
                        <button onClick={saveLead} disabled={!leadForm.customerName.trim()}
                            className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm sm:text-base font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 order-1 sm:order-2">
                            <Save size={18} /> {editingId ? "Update Lead" : "Save New Lead"}
                        </button>
                    </div>
                </Modal>

                {/* ── VIEW LEAD MODAL ── */}
              {/* ── VIEW LEAD MODAL ── */}
<Modal open={viewModalOpen} onClose={closeViewModal} title={`View Lead Details (LMN${viewingLead?.id || ''})`} maxWidth="max-w-2xl">
    {viewingLead && (
        <div className="space-y-6 text-slate-300">
            
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
                    <Users size={16} /> Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Name</p>
                        <p className="font-medium text-white">{viewingLead.customerName || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Phone</p>
                        <p className="font-medium text-white">{viewingLead.phone || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Email</p>
                        <p className="font-medium text-white">{viewingLead.email || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Company Name</p>
                        <p className="font-medium text-white">{viewingLead.companyName || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
                    <MapPin size={16} /> Business Requirements
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Business Type</p>
                        <p className="font-medium text-white">{viewingLead.businessType || 'Product'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Requirement / Product</p>
                        <p className="font-medium text-white">{viewingLead.requirement || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Budget</p>
                        <p className="font-medium text-white">{viewingLead.budget ? `₹${Number(viewingLead.budget).toLocaleString('en-IN')}` : 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Expected Purchase Date</p>
                        <p className="font-medium text-white">{viewingLead.expectedPurchaseDate || 'TBD'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Priority</p>
                        <p className="font-medium text-white">{viewingLead.priority || 'Medium'}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Requirement Details</p>
                        <p className="font-medium text-white">{viewingLead.requirementDetails || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <h4 className="text-purple-400 font-bold mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
                    <Target size={16} /> Lead Source & Management
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Lead Source</p>
                        <p className="font-medium text-white">{viewingLead.leadSource || viewingLead.platform || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Source Details</p>
                        <p className="font-medium text-white">{viewingLead.sourceDetails || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Lead Status</p>
                        <p className="font-medium text-white">{viewingLead.leadStatus || viewingLead.status || 'New'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Assigned To</p>
                        <p className="font-medium text-white">{viewingLead.assignedTo || 'Unassigned'}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Notes</p>
                        <p className="p-2 bg-[#0f172a] rounded border border-slate-700 text-sm">{viewingLead.notes || 'No notes provided.'}</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-2">
                <button onClick={closeViewModal} className="px-6 py-2.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors">
                    Close Window
                </button>
            </div>
        </div>
    )}
</Modal>
                {/* ── LEAD HISTORY MODAL ── */}
                <Modal open={historyModalOpen} onClose={closeHistoryModal} title={`Lead History - LMN${historyLead?.id || ''} | ${historyLead?.customerName || 'N/A'}`} maxWidth="max-w-2xl">
                    {historyLead && (() => {
                        const timeline = buildLeadTimeline(historyLead);
                        const rawHistory = safeParseHistory(historyLead.history); // newest-first
                        const createdEntry = rawHistory.find(h => /^Lead Created$/i.test(h.action || ''));
                        const leadCreated = fmtDate(historyLead.createdAt) || createdEntry?.date || null;
                        const leadUpdated = fmtDate(historyLead.updatedAt) || rawHistory[0]?.date || null;
                        // Merge in the derived accounts summary (real payment data lives
                        // in paymentHistoryDetails[]/paymentRequests[], not flat fields —
                        // see deriveAccountsData) so "Complete Record by Stage → Accounts"
                        // shows actual figures instead of reading everything as empty.
                        const enrichedHistoryLead = { ...historyLead, ...deriveAccountsData(historyLead) };
                        return (
                            <div className="space-y-6">
                                {/* Current stage banner */}
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Current Stage</span>
                                        <span className="px-2.5 py-1 rounded-lg text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            {historyLead.finalStatus || historyLead.status || 'Jobs'}
                                        </span>
                                        {historyLead.assignedTo && historyLead.assignedTo !== 'Unassigned' && (
                                            <span className="text-xs text-slate-400">Handled By: <span className="text-slate-200 font-semibold">{historyLead.assignedTo}</span></span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-100">{historyLead.leadResponse || historyLead.status || 'N/A'}</p>
                                    <div className="text-xs text-slate-400 space-y-0.5">
                                        <p>Lead Created: <span className="text-slate-300">{leadCreated || 'N/A'}</span></p>
                                        <p>Lead Updated: <span className="text-slate-300">{leadUpdated || 'N/A'}</span></p>
                                    </div>
                                </div>

                                {/* Chronological Timeline — diamond markers, oldest → newest */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-300 mb-1 flex items-center gap-2">
                                        <History size={16} className="text--400" /> Full Journey
                                    </h4>
                                    <div className="h-px bg-emerald-500/40 mb-4" />
                                    {timeline.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No activity recorded yet.</p>
                                    ) : (
                                        <div className="relative border-l-2 border-slate-700 ml-2 space-y-5">
                                            {timeline.map((log, idx) => {
                                                const isCurrent = idx === timeline.length - 1;
                                                const stageColor = STAGE_CONFIG.find(s => s.key === log.stage)?.color?.split(' ')[0] || 'text-slate-300';
                                                const body = (
                                                    <>
                                                        <p className="text-xs text-slate-500 mb-0.5">{log.date}</p>
                                                        <p className={`text-sm font-bold ${stageColor}`}>{log.title}</p>
                                                        {log.parts && log.parts.length > 0 && (
                                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                                {log.parts.map((p, pi) => (
                                                                    <span key={pi}>
                                                                        {pi > 0 && ' | '}
                                                                        {p.label && <span className="text-slate-400">{p.label}{p.value ? ': ' : ''}</span>}
                                                                        {p.value && <span className="text-rose-400 font-semibold">{p.value}</span>}
                                                                    </span>
                                                                ))}
                                                            </p>
                                                        )}
                                                    </>
                                                );
                                                return (
                                                    <div key={idx} className="pl-6 relative">
                                                        <span className={`absolute -left-[7px] top-1 w-3 h-3 rotate-45 ring-4 ring-[#1e293b] ${isCurrent ? 'bg-blue-500' : (log._explicit ? 'bg-purple-500' : 'bg-slate-500')}`} />
                                                        {isCurrent ? (
                                                            <div className="border border-blue-500/60 bg-blue-500/5 rounded-lg px-3 py-2 -mt-1">
                                                                {body}
                                                            </div>
                                                        ) : body}
                                                    </div>
                                                );
                                            })}
                                            {/* terminal dot, matches mockup's closing marker */}
                                            <div className="pl-6 relative -mt-3">
                                                <span className="absolute -left-[4px] top-0 w-1.5 h-1.5 rounded-full bg-slate-500" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Complete stage-by-stage data — nothing left out */}
                                <div>
                                    <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2 border-t border-slate-700/50 pt-5">
                                        <ClipboardList size={16} className="text-slate-400" /> Complete Record by Stage
                                    </h4>
                                    <div className="space-y-2">
                                        {STAGE_CONFIG.filter(s => s.key !== 'lead').map(stage => {
                                            const fields = STAGE_FIELD_MAPS[stage.key] || [];
                                            const populated = fields.filter(([f]) => {
                                                const v = enrichedHistoryLead[f];
                                                return v !== undefined && v !== null && v !== '' && v !== false;
                                            });
                                            const hasData = populated.length > 0;
                                            const isOpen = expandedStage === stage.key;
                                            const StageIcon = stage.icon;
                                            return (
                                                <div key={stage.key} className={`rounded-xl border ${hasData ? 'border-slate-700' : 'border-slate-800'} overflow-hidden`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => hasData && setExpandedStage(isOpen ? null : stage.key)}
                                                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${hasData ? 'bg-slate-800/50 hover:bg-slate-800 cursor-pointer' : 'bg-slate-900/30 cursor-default'}`}
                                                    >
                                                        <span className={`flex items-center gap-2 text-sm font-bold ${hasData ? stage.color.split(' ')[0] : 'text-slate-600'}`}>
                                                            <StageIcon size={15} /> {stage.label}
                                                        </span>
                                                        {hasData ? (
                                                            <span className="flex items-center gap-2 text-xs text-slate-400">
                                                                {populated.length} field{populated.length > 1 ? 's' : ''} recorded
                                                                <ChevronRight size={14} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-600 italic">Not reached yet</span>
                                                        )}
                                                    </button>
                                                    {hasData && isOpen && (
                                                        <div className="px-4 py-3 bg-[#0f172a] grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-700/50">
                                                            {populated.map(([field, label]) => (
                                                                <div key={field}>
                                                                    <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{label}</p>
                                                                    <p className="text-sm text-slate-200 break-words">{String(enrichedHistoryLead[field])}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button onClick={closeHistoryModal} className="px-6 py-2.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors">
                                        Close Window
                                    </button>
                                </div>
                            </div>
                        );
                    })()}
                </Modal>

            </div>
        );
    };

    export default LeadsManager;