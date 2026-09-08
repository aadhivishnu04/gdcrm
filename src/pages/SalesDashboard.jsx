import React, { useState, useEffect, useRef } from 'react';
import { 
    ShoppingCart, Target, Search, Filter, Eye, Calendar, MapPin, 
    CheckSquare, X, Send, Pencil, Mic, Square, Trash2, Play, 
    RefreshCw, Users, ArrowUp, ChevronLeft, ChevronRight, ChevronDown, History,
    Plus, UserPlus, Phone, Mail, Globe, MessageSquare, CreditCard,
    Flame, Sun, Snowflake, Save, FileText, Briefcase, ClipboardList, Wallet, PackageCheck
} from 'lucide-react';
import { getCurrentUser } from '../utils/auth';
import { apiFetch } from '../utils/api';

// ─── DOMESTIC DESTINATION DETECTION (kept in sync with OperationsDashboard.jsx) ──
const INDIAN_DESTINATION_KEYWORDS = [
    'goa', 'kerala', 'kashmir', 'ladakh', 'leh', 'manali', 'shimla', 'darjeeling',
    'gangtok', 'sikkim', 'meghalaya', 'assam', 'tamil nadu', 'karnataka', 'maharashtra',
    'rajasthan', 'gujarat', 'uttarakhand', 'puducherry', 'andaman', 'lakshadweep', 'kanyakumari',
    'india', 'delhi', 'mumbai', 'chennai', 'bangalore', 'hyderabad', 'kolkata'
];
const getDefaultTripType = (lead) => {
    const destination = (lead.confirmedDestination || lead.destination || '').toLowerCase();
    if (!destination) return '';
    return INDIAN_DESTINATION_KEYWORDS.some(place => destination.includes(place)) ? 'Domestic' : 'International';
};

 
// ─── NEW LEAD FORM INITIAL STATE ─────────────────────────────────────────────
const initialNewLeadState = {
    customerName: '',
    phone: '',
    email: '',
    companyName: '',
    businessType: 'Product',
    requirement: '',
    budget: '',
    expectedPurchaseDate: '',
    priority: 'Medium',
    requirementDetails: '',
    leadSource: 'Website',
    sourceDetails: '',
    leadStatus: 'New',
    assignedTo: '',
    followupDate: '',
    notes: ''
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BUSINESS_TYPE_OPTIONS = ['Product', 'Service', 'Consultation', 'Wholesale', 'Retail', 'Other'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const LEAD_SOURCE_OPTIONS = ['Website', 'Google', 'Facebook', 'Instagram', 'WhatsApp', 'Referral', 'Phone', 'Walk-in', 'Other'];
const LEAD_STATUS_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
const BUDGET_OPTIONS = ['Below ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', '₹1,00,000 - ₹2,00,000', '₹2,00,000 - ₹5,00,000', 'Above ₹5,00,000'];
const PLATFORM_OPTIONS = LEAD_SOURCE_OPTIONS;
// Utility to format ISO/yyyy-mm-dd strings to DD-MM-YYYY
const formatDMY = (dateStr) => {
    if (!dateStr) return '';
    try {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return dateStr;
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (e) {
        return dateStr;
    }
};

// Utility to format ISO strings to highly readable strings
const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        let hours = dateObj.getHours();
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const strHours = String(hours).padStart(2, '0');

        return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
    } catch (e) {
        return dateStr;
    }
};

// ─── LEAD JOURNEY / FULL HISTORY ENGINE ───────────────────────────────────────
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

const fmtHistoryDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return typeof val === 'string' ? val : null;
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const splitLabelValue = (text) => {
    if (!text) return null;
    const idx = text.indexOf(':');
    if (idx === -1) return { label: text.trim(), value: null };
    return { label: text.slice(0, idx).trim(), value: text.slice(idx + 1).trim() };
};

const STAGE_CONFIG = [
    { key: 'lead', label: 'Lead Captured', color: 'text-teal-400 bg-teal-500/10 border-teal-500/20', icon: Target },
    { key: 'sales', label: 'Sales', color: 'text-white-400 bg-purple-500/10 border-purple-500/20', icon: Briefcase },
    { key: 'operations', label: 'Operations', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: ClipboardList },
    { key: 'accounts', label: 'Accounts / Billing', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Wallet },
    { key: 'fulfillment', label: 'Fulfillment', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: PackageCheck },
];

const classifySalesEntry = (h, lead) => {
    const action = h.action || '';
    const note = h.note || '';

    if (/^Lead Created$/i.test(action)) return null;
    if (/^Auto-Moved to Recycle Bin$/i.test(action) || /^Archived Cycle:/i.test(action)) return null;

    const assignMatch = action.match(/^(?:Recovered & )?Assigned to (.+)$/i);
    if (assignMatch) {
        return { title: 'Lead Assigned', parts: [{ label: 'Assigned by', value: assignMatch[1].trim() }] };
    }

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

    return { title: action, parts: [splitLabelValue(note)].filter(Boolean) };
};

const buildLeadTimeline = (lead) => {
    if (!lead) return [];

    const explicit = safeParseHistory(lead.history).slice().reverse().map(h => {
        const classified = classifySalesEntry(h, lead);
        if (!classified) return null;
        return {
            date: h.date,
            stage: 'sales',
            title: classified.title,
            parts: (classified.parts || []).filter(p => p && (p.value || p.label)),
            _explicit: true,
        };
    }).filter(Boolean);

    const synthesized = [];
    const push = (stage, title, dateVal, parts) => synthesized.push({
        date: fmtHistoryDate(dateVal) || 'Recorded',
        stage, title,
        parts: (parts || []).filter(p => p && (p.value || p.label)),
        _explicit: false,
    });

    const custReqs = safeParseArr(lead.customisationRequests);
    if (lead.status === 'Move To Operation' || lead.sentToOperationsDate || custReqs.length) {
        const destinations = custReqs.map(r => r.destination || r.destinationRequest).filter(Boolean).join(', ')
            || lead.destinationRequest || lead.destination;
        push('operations', 'Sent To Operations', lead.sentToOperationsDate || lead.movedToOpsDate, [
            { label: 'Destination', value: destinations || 'N/A' }
        ]);
    }

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

    if (lead.sharedWithSales) {
        push('operations', 'Back to Sales Board', lead.sharedWithSalesDate, [
            { label: 'Destination shared by ops', value: lead.destinationRequest || lead.destination }
        ]);
    }

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

    if (lead.amountReceived || lead.paymentStatus) {
        push('accounts', 'Customer Payment', lead.nextPaymentDate || lead.confirmedDate, [
            { label: 'Payment Stage', value: lead.paymentMode ? `${lead.paymentMode} • ₹${lead.amountReceived || 0} received` : `₹${lead.amountReceived || 0} received` }
        ]);
    }
    if (lead.paymentStatus === 'Fully Paid' || (lead.balancePending !== undefined && Number(lead.balancePending) === 0 && lead.amountReceived)) {
        push('accounts', 'Customer Payment', lead.fullyPaidDate || lead.nextPaymentDate, [
            { label: 'Payment Stage', value: 'Fully Paid' }
        ]);
    }

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

    return [...explicit, ...synthesized];
};

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
    ],
    fulfillment: [
        ['briefedByVal', 'Briefed By'], ['briefingDateVal', 'Briefing Date'], ['briefedMethodVal', 'Briefing Method'],
        ['dmcConfReceived', 'DMC Confirmation'], ['flightTicketVerified', 'Flight Ticket Verified'], ['domTicketVerified', 'Domestic Ticket Verified'],
        ['clrOpsDocs', 'Docs Cleared'], ['clrOpsServices', 'Services Cleared'], ['clrFinPayment', 'Finance Cleared'],
        ['clrMgrReview', 'Manager Reviewed'], ['clrReadyDeparture', 'Ready for Departure'], ['vendorPayStatus', 'Vendor Payment Status'],
    ],
};

const SalesDashboard = () => {
    // --- USER IDENTIFICATION ---
    const user = getCurrentUser();
    const loggedInUserName = user?.name || user?.username || user?.email || 'Admin';
    const isAdmin = user?.role?.toLowerCase() === 'admin' || loggedInUserName.toLowerCase() === 'admin';

    // Shared Input / UI Classes
    const inputCls = "w-full px-3 py-2 sm:py-1.5 bg-slate-900 border border-slate-700 rounded-lg sm:rounded text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all";
    const selectCls = "w-full px-3 py-2 sm:py-1.5 bg-slate-900 border border-slate-700 rounded-lg sm:rounded text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none cursor-pointer transition-all";
    const readonlyCls = "w-full px-3 py-2 sm:py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg sm:rounded text-slate-400 text-sm cursor-not-allowed";
    const inlineInputCls = "bg-[#091124] text-slate-200 text-xs sm:text-sm border border-slate-700/60 rounded px-2.5 sm:px-2 py-1.5 sm:py-0.5 outline-none focus:border-cyan-500 w-full transition-all";
    const sectionCls = "py-4 sm:py-5 transition-all duration-300";
    const sectionHeadCls = "text-sm sm:text-base font-bold text-cyan-400 tracking-wider uppercase";

    // --- STATE WITH SESSION CACHING ---
    const [jobs, setJobs] = useState(() => {
        try {
            const cached = sessionStorage.getItem('salesDashboardJobs');
            return cached ? JSON.parse(cached) : [];
        } catch (e) {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(() => {
        return !sessionStorage.getItem('salesDashboardJobs');
    });
    
    const [activeTab, setActiveTab] = useState('Jobs');

    // --- SEARCH & FILTER STATES ---
    const [searchName, setSearchName] = useState('');
    const [searchId, setSearchId] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [searchDestination, setSearchDestination] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('All');

    // --- PAYMENT SEARCH MODAL STATES ---
    const [isPaymentSearchModalOpen, setIsPaymentSearchModalOpen] = useState(false);
    const [paymentSearchQuery, setPaymentSearchQuery] = useState('');

    // --- SCROLL TO TOP STATE ---
    const [showScrollButton, setShowScrollButton] = useState(false);
    const tabScrollRef = useRef(null);

    // --- MODAL STATES ---
    const [selectedLead, setSelectedLead] = useState(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignTo, setAssignTo] = useState('');
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [expandedStage, setExpandedStage] = useState(null);

    // --- HANDOVER TO OPERATION MODAL STATES ---
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
    const [handoverLead, setHandoverLead] = useState(null);
    const [handoverLeadId, setHandoverLeadId] = useState('');
    const [handoverTarget, setHandoverTarget] = useState('');
    const [handoverNotes, setHandoverNotes] = useState('');
    const [handoverOption, setHandoverOption] = useState('employee'); 

    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignOption, setReassignOption] = useState('pool');
    const [reassignTargetEmployee, setReassignTargetEmployee] = useState('');
    const [reassignReason, setReassignReason] = useState('');
    
    // --- PREVIOUS ATTEMPTS LOG CRUD STATES ---
    const [editingLogIndex, setEditingLogIndex] = useState(null);
    const [editingLogData, setEditingLogData] = useState({ interaction: '', action: '', notes: '' });
    const [isPreviousAttemptsModalOpen, setIsPreviousAttemptsModalOpen] = useState(false);

    // --- NEW LEAD MODAL STATES ---
    const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
    const [newLeadForm, setNewLeadForm] = useState(initialNewLeadState);
    const [isSubmittingNewLead, setIsSubmittingNewLead] = useState(false);
    const [campaignOptions, setCampaignOptions] = useState([]);

    // --- DYNAMIC DATA STATES ---
    const [operationsStaff, setOperationsStaff] = useState([]);
    const [salesStaff, setSalesStaff] = useState([]);

    // --- EDIT MODAL & ACCORDION STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        leadInfo: false, salesActivity: true, travelDetails: false, customisation: false,
        operationResponse: false, bookingConfirmation: false, paymentInfo: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // --- NEW PASSENGER STATE ---
    const [currentPassenger, setCurrentPassenger] = useState({
        fullName: '', dob: '', gender: '', aadharNumber: '', mobileNumber: '', emergencyContact: '',
        panNumber: '', passportNumber: '', passportIssuePlace: '', passportIssueDate: '', passportExpiryDate: ''
    });

    const handleCurrentPassengerChange = (e) => {
        const { name, value } = e.target;
        if (name === 'aadharNumber') {
            setCurrentPassenger(prev => ({ ...prev, aadharNumber: value.replace(/\D/g, '').slice(0, 12) }));
            return;
        }
        setCurrentPassenger(prev => ({ ...prev, [name]: value }));
    };

    const handleAddPassenger = () => {
        setEditFormData(prev => ({
            ...prev,
            passengers: [...(prev.passengers || []), currentPassenger]
        }));
        setCurrentPassenger({
            fullName: '', dob: '', gender: '', aadharNumber: '', mobileNumber: '', emergencyContact: '',
            panNumber: '', passportNumber: '', passportIssuePlace: '', passportIssueDate: '', passportExpiryDate: ''
        });
    };

    const handleRemovePassenger = (index) => {
        setEditFormData(prev => ({
            ...prev,
            passengers: prev.passengers.filter((_, i) => i !== index)
        }));
    };

    const [editFormData, setEditFormData] = useState({
        leadName: '', leadSource: '', leadDate: '', mobileNumber: '', emailAddress: '', assignedTo: '',
        campaign: '', packageType: '', budget: '', messageFromLead: '', tourType: '', destination: '',
        travelDate: '', duration: '', travelBudget: '', hotelCategory: '', noOfAdults: '',
        noOfChildren: '', offers: '', departureCity: '',
        firstAttempt: '', leadResponse: '', interactionType: '', actionTaken: '', 
        leadStatusField: '', salesNotes: '', outcomeNotes: '', followupDate: '',
        leadTemperature: '', objectionTracking: '', bookingProbability: '0%', customerResponse: '', noResponseLogs: [],
        closureReason: '', nextFollowUpDatePostponed: '',
        services: '', remarks: '', customisationRequests: [],
        opsPreparedBy: '', opsCompletedOn: '', opsRemarks: '', opsActionTaken: '',
        opsVerificationStatus: 'Pending Verified', opsSharedWithClient: 'No', 
        packagePreparedFor: '', packageCost: '', operationNotes: '', salesReviewStatus: '',
        billingName: '', bookingDate: '', operationExecutive: '',
        confirmedTripType: '', confirmedDestination: '', confirmedDuration: '', noOfPax: '', confirmedNoOfChildren: '',
        transportMode: '', departureDate: '', tourStartDate: '', returnDate: '', travelEndDate: '', tourEndDate: '', totalPackageCost: '', specialOffers: '',
        arrivalDate: '', flightStatus: '', visaStatus: '', insuranceStatus: '', 
        confirmedMethod: '', confirmedDate: '', confirmedServices: '', discount: '', finalPackageValue: '', serviceCost: '',
        service1Cost: '', service2Cost: '', service3Cost: '', serviceCosts: {}, gst: '', tcs: '', passengers: [],
        aadharCopy: '', passportCopy: '', photograph: '', docRemarks: '',
        attachedFiles: [],
        paymentDueDate: '', transactionId: '', amountReceived: '', paymentMode: '', customerPaymentDate: '',
        nextPaymentDate: '', paymentStatus: '', paymentHistoryDetails: '', voiceRecordings: [], salesVoiceRecordings: [], outcomeVoiceRecordings: [],
        leadStatus: 'Jobs', gstInclusion: '', tcsInclusion: '', paymentService: '', paymentHistoryList: [],
        followUpCount: 0, followUpType: '', followupAction: '', history: []
    });

    useEffect(() => {
        if (isEditModalOpen && editFormData.departureDate && !editFormData.paymentDueDate) {
            const depDate = new Date(editFormData.departureDate);
            if (!isNaN(depDate.getTime())) {
                depDate.setDate(depDate.getDate() - 10);
                const formatted = depDate.toISOString().split('T')[0];
                setEditFormData(prev => ({ ...prev, paymentDueDate: formatted }));
            }
        }
    }, [editFormData.departureDate, isEditModalOpen]);

    useEffect(() => {
        if (editFormData.confirmedTripType !== 'International' && editFormData.tcs) {
            setEditFormData(prev => ({ ...prev, tcs: '' }));
        }
    }, [editFormData.confirmedTripType]);

    useEffect(() => {
        let probVal = 0; 
        const { leadResponse, actionTaken, customerResponse } = editFormData;

        if (customerResponse === 'Booking Confirmed') { probVal = 100; } 
        else if (customerResponse === 'Negotiation') { probVal = 90; } 
        else if (customerResponse === 'Needs Revision') { probVal = 75; } 
        else if (actionTaken === 'Customisation Required') { probVal = 50; } 
        else if (leadResponse === 'Requirement Collected') { probVal = 25; } 
        else if (leadResponse === 'No Response') { probVal = 0; }

        let temp = 'Cold';
        if (probVal >= 75) temp = 'Hot';
        else if (probVal >= 26 && probVal <= 74) temp = 'Warm';

        setEditFormData(prev => ({ ...prev, bookingProbability: `${probVal}%`, leadTemperature: temp }));
    }, [editFormData.leadResponse, editFormData.customerResponse, editFormData.actionTaken]);

    useEffect(() => {
        if (isEditModalOpen && editFormData.customerResponse === 'Booking Confirmed' && !editFormData.confirmedDate) {
            setEditFormData(prev => ({ ...prev, confirmedDate: new Date().toISOString().split('T')[0] }));
        }
    }, [editFormData.customerResponse, isEditModalOpen]);

    const handleDirectFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        files.forEach(file => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                setEditFormData(prev => ({
                    ...prev,
                    attachedFiles: [...(prev.attachedFiles || []), {
                        name: file.name,
                        base64: reader.result,
                        type: file.type
                    }]
                }));
            };
        });
    };

    const removeAttachedFile = (index) => {
        setEditFormData(prev => ({
            ...prev,
            attachedFiles: prev.attachedFiles.filter((_, i) => i !== index)
        }));
    };

    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [playingIndex, setPlayingIndex] = useState(null);

    const recordingTypeRef = useRef('voiceRecordings'); 
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioPlayersRef = useRef({});

    const handlePreventEnterSubmit = (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    };

    const appendHistory = (existingHistory, action, note) => {
        const timestamp = new Date().toLocaleString('en-IN', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
        
        let currentHistory = [];
        if (typeof existingHistory === 'string') {
            try { currentHistory = JSON.parse(existingHistory); } catch (e) { currentHistory = []; }
        } else if (Array.isArray(existingHistory)) { currentHistory = existingHistory; }

        return [{ date: timestamp, action, note }, ...currentHistory];
    };

    const handleCustomisationChange = (index, field, value) => {
        const newRequests = [...editFormData.customisationRequests];
        newRequests[index] = { ...newRequests[index], [field]: value };
        setEditFormData(prev => ({ ...prev, customisationRequests: newRequests }));
    };

    const addCustomisationRequest = () => {
        setEditFormData(prev => ({
            ...prev,
            customisationRequests: [
                ...prev.customisationRequests,
                {
                    destination: prev.destination || '', customisationType: '', requirements: '',
                    assignedTo: '', raiseRequest: 'No', readymadePackageDetails: '', turnaroundTime: '', status: 'Pending'
                }
            ]
        }));
    };
    
    const removeCustomisationRequest = (index) => {
        setEditFormData(prev => ({ ...prev, customisationRequests: prev.customisationRequests.filter((_, i) => i !== index) }));
    };

    const renderDatePicker = (name, value, label, onChangeHandler, placeholderText = '', disabled = false) => {
        return (
            <div className="w-full">
                {label && <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">{label}</label>}
                <div 
                    onClick={(e) => { if(!disabled) { try { e.currentTarget.querySelector('input[type="date"]').showPicker(); } catch(err){} } }}
                    className={`relative bg-slate-900 border border-slate-700 rounded-lg sm:rounded focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all overflow-hidden group flex items-center ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-900/50' : 'cursor-pointer'}`}
                >
                    <input 
                        type="date" 
                        name={name} 
                        value={value || ''} 
                        onChange={onChangeHandler} 
                        disabled={disabled} 
                        className={`w-full px-3 py-2 sm:py-1.5 bg-transparent text-white text-sm outline-none appearance-none relative z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:left-0 [&::-webkit-calendar-picker-indicator]:top-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} 
                    />
                    <Calendar size={16} className="absolute right-3 text-slate-400 group-hover:text-cyan-400 z-0 transition-colors pointer-events-none" />
                </div>
                {placeholderText && <p className="text-[9px] text-slate-500 mt-0.5 italic">{placeholderText}</p>}
            </div>
        );
    };

    const renderArrayDropdown = (field, value, index, defaultOption, optionsList) => {
        const handleSelect = (e) => handleCustomisationChange(index, field, e.target.value);
        const optionValues = optionsList.map(opt => typeof opt === 'object' ? opt.value : opt);
        const isOthersTrigger = value && ['others', 'other'].includes(String(value).toLowerCase());
        const isManual = value && (isOthersTrigger || !optionValues.includes(value));

        if (isManual) {
            return (
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={isOthersTrigger ? '' : value}
                        onChange={(e) => handleCustomisationChange(index, field, e.target.value)}
                        placeholder="Type here..."
                        autoFocus
                        className={`${selectCls} pr-8`}
                    />
                    <button type="button" onClick={() => handleCustomisationChange(index, field, '')}
                        className="absolute right-2 text-slate-400 hover:text-red-400 p-0.5" title="Back to dropdown">
                        <X size={14} />
                    </button>
                </div>
            );
        }

        return (
            <select value={value || ''} onChange={handleSelect} className={selectCls}>
                {defaultOption !== null && <option value="" disabled hidden>{defaultOption}</option>}
                {optionsList.map((opt, idx) => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    return <option key={idx} value={optVal}>{optLabel}</option>;
                })}
            </select>
        );
    };

    const renderDropdown = (name, value, defaultOption, optionsList, onChangeHandler, customClass = selectCls, disabled = false) => {
        const handleSelect = (e) => onChangeHandler(e);
        const optionValues = optionsList.map(opt => typeof opt === 'object' ? opt.value : opt);
        const isOthersTrigger = value && ['others', 'other'].includes(String(value).toLowerCase());
        const isManual = value && (isOthersTrigger || !optionValues.includes(value));

        if (isManual) {
            return (
                <div className="relative flex items-center">
                    <input
                        type="text"
                        name={name}
                        value={isOthersTrigger ? '' : value}
                        onChange={onChangeHandler}
                        disabled={disabled}
                        placeholder="Type here..."
                        autoFocus
                        className={`${customClass} pr-8 ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-900/50' : ''}`}
                    />
                    {!disabled && (
                        <button type="button" onClick={() => onChangeHandler({ target: { name, value: '', type: 'text' } })}
                            className="absolute right-2 text-slate-400 hover:text-red-400 p-0.5" title="Back to dropdown">
                            <X size={14} />
                        </button>
                    )}
                </div>
            );
        }

        return (
            <select name={name} value={value || ''} onChange={handleSelect} disabled={disabled} className={`${customClass} ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-900/50' : ''}`}>
                {defaultOption !== null && <option value="" disabled hidden>{defaultOption}</option>}
                {optionsList.map((opt, idx) => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    return <option key={idx} value={optVal}>{optLabel}</option>;
                })}
            </select>
        );
    };

    const renderMultiSelect = (name, value, options, disabled = false) => {
        const selected = value ? value.split(', ').filter(Boolean) : [];
        const toggle = (opt) => {
            if (disabled) return;
            let newSelected;
            if (selected.includes(opt)) {
                newSelected = selected.filter(o => o !== opt);
            } else {
                newSelected = [...selected, opt];
            }
            handleInputChange({ target: { name, value: newSelected.join(', '), type: 'text' } });
        };
        return (
            <div className="flex flex-wrap gap-2 mt-1">
                {options.map(opt => (
                    <div key={opt} onClick={() => toggle(opt)} 
                         className={`px-2.5 py-1 text-[11px] sm:text-xs rounded border transition-all ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selected.includes(opt) ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-medium' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                        {opt}
                    </div>
                ))}
            </div>
        );
    };

    const handleLogNoResponse = async (logType = 'interaction') => {
        const isOutcome = logType === 'outcome';
        const currentNotes = isOutcome ? editFormData.outcomeNotes : editFormData.salesNotes;
        const currentInteraction = isOutcome ? 'Sales Track Update' : editFormData.interactionType;
        const currentAction = isOutcome ? editFormData.customerResponse : editFormData.actionTaken;

        if (!currentNotes && !currentInteraction && !currentAction) {
            alert("Please enter notes, interaction type, or action first.");
            return;
        }
        
        const newEntry = { timestamp: formatDateTime(new Date().toISOString()), interaction: currentInteraction, action: currentAction, notes: currentNotes };
    
        let updatedLogs = [...(editFormData.noResponseLogs || []), newEntry];
        let updatedCount = updatedLogs.length; 
        let updatedHistory = appendHistory(editFormData.history, `${isOutcome ? 'Outcome Update' : 'Follow-up'}: ${currentInteraction || 'Logged'}`, currentNotes || currentAction);

        let newStatus = selectedLead?.status || editFormData.leadStatus;
        
        if (updatedCount >= 10) newStatus = 'Recycle Bin';

        if (newStatus === 'Recycle Bin' && updatedCount > 0) {
            updatedHistory = appendHistory(updatedHistory, 'Auto-Moved to Recycle Bin', `Reached max follow-ups. Counter reset to 0. Archiving past attempts.`);
            [...updatedLogs].reverse().forEach(log => {
                updatedHistory = appendHistory(
                    updatedHistory, 
                    `Archived Cycle: ${log.interaction || 'Attempt'}`, 
                    `Action: ${log.action || 'N/A'} | Notes: ${log.notes || 'None'} | Time: ${log.timestamp}`
                );
            });
            updatedLogs = [];
            updatedCount = 0;
        }

        setEditFormData(prev => ({
            ...prev,
            noResponseLogs: updatedLogs, followUpCount: updatedCount, history: updatedHistory,
            ...(isOutcome ? { outcomeNotes: '' } : { salesNotes: '' }), 
            leadStatus: newStatus
        }));

        try {
            await apiFetch(`/leads/${selectedLead.id}`, {
                method: 'PUT',
                body: JSON.stringify({ noResponseLogs: JSON.stringify(updatedLogs), followupCount: updatedCount, history: JSON.stringify(updatedHistory), status: newStatus })
            });
            await fetchJobs(true);
        } catch (e) { console.error("Auto-save log failed", e); }
    };

    const handleAddPaymentHistory = async () => {
        const { customerPaymentDate, paymentStatus, paymentService, amountReceived, paymentMode, transactionId } = editFormData;
        if (!amountReceived || !paymentMode) {
            alert("Please fill in Amount Collected and Payment Mode to save the record.");
            return;
        }

        const newPaymentRecord = {
            date: customerPaymentDate || new Date().toISOString().split('T')[0],
            stage: paymentStatus || 'First Payment',
            service: paymentService || 'Tour Package',
            amount: amountReceived,
            mode: paymentMode,
            transactionId: transactionId || '',
            verified: false
        };

        const updatedList = [...(editFormData.paymentHistoryList || []), newPaymentRecord];
        const currentStatus = selectedLead?.status || editFormData.leadStatus;
        const alreadyForwarded = ['Confirmed Bookings', 'Move To Operation', 'Upcoming Departure', 'Trip Completed', 'Trip Closed', 'Handover Completed'].includes(currentStatus);
        const newStatus = alreadyForwarded ? currentStatus : 'Confirmed Bookings';

        setEditFormData(prev => ({
            ...prev,
            paymentHistoryList: updatedList,
            leadStatus: newStatus,
            amountReceived: '',
            transactionId: '',
            customerPaymentDate: '',
            paymentMode: '',
            paymentStatus: '',
            paymentService: ''
        }));

        if (!selectedLead?.id) return;

        try {
            await apiFetch(`/leads/${selectedLead.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    paymentHistoryDetails: JSON.stringify(updatedList),
                    status: newStatus
                })
            });
            await fetchJobs(true);
        } catch (e) {
            console.error("Failed to forward payment to Accounts:", e);
            alert("Payment saved on this screen, but syncing to Accounts failed. It will retry when you click Submit.");
        }
    };

    const handleDeleteLog = async (indexToDelete) => {
        if (!window.confirm('Are you sure you want to delete this log?')) return;
        const updatedLogs = editFormData.noResponseLogs.filter((_, idx) => idx !== indexToDelete);
        const updatedCount = updatedLogs.length;
        let newStatus = selectedLead?.status || editFormData.leadStatus;
        if (updatedCount < 10 && newStatus === 'Recycle Bin') newStatus = 'Jobs'; 
        setEditFormData(prev => ({ ...prev, noResponseLogs: updatedLogs, followUpCount: updatedCount, leadStatus: newStatus }));

        try {
            await apiFetch(`/leads/${selectedLead.id}`, {
                method: 'PUT',
                body: JSON.stringify({ noResponseLogs: JSON.stringify(updatedLogs), followupCount: updatedCount, status: newStatus })
            });
            await fetchJobs(true);
        } catch (e) { console.error("Auto-save log delete failed", e); }
    };

    const handleEditLogStart = (index, log) => {
        setEditingLogIndex(index);
        setEditingLogData({ interaction: log.interaction || '', action: log.action || '', notes: log.notes || '' });
    };

    const handleEditLogCancel = () => setEditingLogIndex(null);

    const handleEditLogSave = async (indexToSave) => {
        const updatedLogs = [...editFormData.noResponseLogs];
        updatedLogs[indexToSave] = { ...updatedLogs[indexToSave], interaction: editingLogData.interaction, action: editingLogData.action, notes: editingLogData.notes };
        setEditFormData(prev => ({ ...prev, noResponseLogs: updatedLogs }));
        setEditingLogIndex(null);

        try {
            await apiFetch(`/leads/${selectedLead.id}`, {
                method: 'PUT',
                body: JSON.stringify({ noResponseLogs: JSON.stringify(updatedLogs) })
            });
            await fetchJobs(true);
        } catch (e) { console.error("Auto-save log edit failed", e); }
    };

    const fetchJobs = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const data = await apiFetch('/leads');
            const sanitized = data.map(item => {
                let parsedHistory = [];
                if (typeof item.history === 'string') { try { parsedHistory = JSON.parse(item.history); } catch(e) {} } 
                else if (Array.isArray(item.history)) { parsedHistory = item.history; }
                return { ...item, status: item.status || 'Jobs', history: parsedHistory };
            });
            setJobs(sanitized);
            sessionStorage.setItem('salesDashboardJobs', JSON.stringify(sanitized));
        } catch (error) { 
            console.error('Failed to fetch leads:', error); 
        } finally { 
            if (!isSilent) setIsLoading(false); 
        }
    };

    useEffect(() => {
        fetchJobs(jobs.length > 0);
        const backgroundPoll = setInterval(() => {
            fetchJobs(true);
        }, 30000);
        return () => {
            clearInterval(timerRef.current);
            clearInterval(backgroundPoll);
        };
    }, [activeTab]);

    useEffect(() => {
        const fetchStaffDirectory = async () => {
            try {
                const data = await apiFetch('/employees');

                const sales = data.filter(emp => {
                    const searchString = `${emp.designation || ''} ${emp.role || ''} ${emp.department || ''}`.toLowerCase();
                    return searchString.includes('sales');
                }).map(emp => emp.name || emp.username);

                const ops = data.filter(emp => {
                    const searchString = `${emp.designation || ''} ${emp.role || ''} ${emp.department || ''}`.toLowerCase();
                    return searchString.includes('operation') || searchString.includes('ops');
                }).map(emp => emp.name || emp.username);

                setSalesStaff(sales);
                setOperationsStaff(ops);
            } catch (error) { 
                console.error('Failed to fetch dynamic directory components:', error); 
            }
        };
        fetchStaffDirectory();
    }, []);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const data = await apiFetch('/campaigns');
                if (Array.isArray(data)) setCampaignOptions(data.map(c => c.name || c));
            } catch (error) { console.error('Failed to fetch campaigns:', error); }
        };
        fetchCampaigns();
    }, []);

    useEffect(() => {
        const handleScrollVisibility = () => setShowScrollButton(window.scrollY > 300);
        window.addEventListener("scroll", handleScrollVisibility);
        return () => window.removeEventListener("scroll", handleScrollVisibility);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
    const scrollTabs = (dir) => tabScrollRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });

    const handleOpenNewLeadModal = () => { setNewLeadForm(initialNewLeadState); setIsNewLeadModalOpen(true); };

    const handleNewLeadInputChange = (e) => {
        const { name, value } = e.target;
        setNewLeadForm(prev => ({ ...prev, [name]: value }));
    };

    const handleNewLeadSubmit = async (e) => {
        e.preventDefault();
        if (!newLeadForm.customerName.trim() || !newLeadForm.phone.trim()) {
            alert('Customer name and phone number are required.');
            return;
        }

        setIsSubmittingNewLead(true);
        try {
            const initialHistory = appendHistory([], 'Lead Created', `Source: ${newLeadForm.leadSource}${newLeadForm.sourceDetails ? ` (${newLeadForm.sourceDetails})` : ''} | Added manually via Sales Dashboard`);
            const payload = {
                customerName: newLeadForm.customerName, phone: newLeadForm.phone, email: newLeadForm.email, companyName: newLeadForm.companyName,
                businessType: newLeadForm.businessType, requirement: newLeadForm.requirement, budget: newLeadForm.budget,
                expectedPurchaseDate: newLeadForm.expectedPurchaseDate, priority: newLeadForm.priority, requirementDetails: newLeadForm.requirementDetails,
                leadSource: newLeadForm.leadSource, sourceDetails: newLeadForm.sourceDetails, followupDate: newLeadForm.followupDate,
                notes: newLeadForm.notes,
                // New leads always start unassigned in the Jobs pool — assignment happens
                // later via the Assign action, never at creation time.
                assignedTo: '', status: 'Jobs',
                history: JSON.stringify(initialHistory), dateAdded: new Date().toISOString(),
            };

            const saved = await apiFetch('/leads', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            apiFetch('/notifications/new-lead', {
                method: 'POST',
                body: JSON.stringify({ leadId: saved.id, customerName: saved.customerName, destination: saved.destination, email: saved.email, phone: saved.phone })
            }).catch(err => console.error('Silently failing email trigger:', err));

            await fetchJobs();
            setIsNewLeadModalOpen(false);
        } catch (error) {
            console.error('New lead submit error:', error);
            alert(`Failed to create lead: ${error.message || 'Network error. Check if the backend server is running.'}`);
        } finally { setIsSubmittingNewLead(false); }
    };

    const renderNewLeadDropdown = (name, value, placeholder, options) => {
        const handleSelect = (e) => setNewLeadForm(prev => ({ ...prev, [name]: e.target.value }));
        const isOthersTrigger = value && ['others', 'other'].includes(String(value).toLowerCase());
        const isManual = value && (isOthersTrigger || !options.includes(value));

        if (isManual) {
            return (
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={isOthersTrigger ? '' : value}
                        onChange={(e) => setNewLeadForm(prev => ({ ...prev, [name]: e.target.value }))}
                        placeholder="Type here..."
                        autoFocus
                        className={`${selectCls} pr-8`}
                    />
                    <button type="button" onClick={() => setNewLeadForm(prev => ({ ...prev, [name]: '' }))}
                        className="absolute right-2 text-slate-400 hover:text-red-400 p-0.5" title="Back to dropdown">
                        <X size={14} />
                    </button>
                </div>
            );
        }

        return (
            <select name={name} value={value || ''} onChange={handleSelect} className={selectCls}>
                {placeholder && <option value="" disabled hidden>{placeholder}</option>}
                {options.map((opt, i) => ( <option key={i} value={opt}>{opt}</option> ))}
            </select>
        );
    };

    const startRecording = async (targetField = 'voiceRecordings') => {
        recordingTypeRef.current = targetField;
        audioChunksRef.current = [];
        setRecordingTime(0);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(audioBlob);
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    setEditFormData(prev => ({ 
                        ...prev, 
                        [recordingTypeRef.current]: [...(prev[recordingTypeRef.current] || []), { url, base64: reader.result }] 
                    }));
                };
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } catch (err) { alert('Microphone access denied. Please check system permissions.'); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const deleteRecordingGeneric = (targetField, index) => {
        if (playingIndex === `${targetField}-${index}`) { 
            audioPlayersRef.current[`${targetField}-${index}`]?.pause(); 
            setPlayingIndex(null); 
        }
        setEditFormData(prev => ({ 
            ...prev, 
            [targetField]: prev[targetField].filter((_, i) => i !== index) 
        }));
    };

    const togglePlaybackGeneric = (targetField, index) => {
        const playerKey = `${targetField}-${index}`;
        const player = audioPlayersRef.current[playerKey];
        if (!player) return;
        if (playingIndex === playerKey) { 
            player.pause(); 
            setPlayingIndex(null); 
        } else { 
            if (playingIndex && audioPlayersRef.current[playingIndex]) {
                audioPlayersRef.current[playingIndex].pause(); 
            }
            player.play(); 
            setPlayingIndex(playerKey); 
        }
    };

    const renderVoiceList = (targetField) => {
        const list = editFormData[targetField] || [];
        if (list.length === 0) return null;
        return (
            <div className="mt-2 p-3 bg-slate-900/60 border border-slate-800/60 rounded-lg space-y-2 w-full">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400 tracking-wider">Audio Notes Attached ({list.length})</p>
                <div className="flex flex-col sm:grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {list.map((audio, index) => (
                        <div key={index} className="flex items-center justify-between p-2.5 sm:p-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                            <span className="text-xs sm:text-sm text-slate-300">Voice Note #{index + 1}</span>
                            <div className="flex items-center gap-2 sm:gap-1.5">
                                <button type="button" onClick={() => togglePlaybackGeneric(targetField, index)} className="p-1.5 sm:p-1 rounded-md bg-slate-800 border-none cursor-pointer text-emerald-400 hover:bg-slate-700">
                                    {playingIndex === `${targetField}-${index}` ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                </button>
                                <button type="button" onClick={() => deleteRecordingGeneric(targetField, index)} className="p-1.5 sm:p-1 rounded-md bg-slate-800 border-none cursor-pointer text-red-400 hover:bg-red-950">
                                    <Trash2 size={14} />
                                </button>
                                <audio ref={el => audioPlayersRef.current[`${targetField}-${index}`] = el} src={audio.url} onEnded={() => setPlayingIndex(null)} className="hidden" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const formatTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleOpenReassignModal = (lead) => {
        setSelectedLead(lead); setReassignOption('pool'); setReassignTargetEmployee(''); setReassignReason(''); setIsReassignModalOpen(true);
    };

    const handleReassignSubmit = async () => {
        if (reassignOption === 'employee' && !reassignTargetEmployee) { alert('Please select a sales employee to assign this job.'); return; }
        try {
            const isRecycled = selectedLead.status === 'Recycle Bin' || selectedLead.followupCount >= 10 || selectedLead.followUpCount >= 10;
            
            const actionText = reassignOption === 'pool' 
                ? (isRecycled ? 'Recovered to Jobs Pool' : 'Moved back to Jobs Pool') 
                : (isRecycled ? `Recovered & Assigned to ${reassignTargetEmployee}` : `Reassigned to ${reassignTargetEmployee}`);
                
            const noteText = reassignOption === 'pool' 
                ? 'Released from sales assignment.' 
                : `Reason: ${reassignReason || 'No reason provided.'}`;
                
            let updatedHistory = appendHistory(selectedLead.history, actionText, noteText);
            
            let assignPayload = reassignOption === 'pool'
                ? { assignedTo: '', status: 'Jobs' }
                : { assignedTo: reassignTargetEmployee, status: 'Sales Assigned', reassignmentReason: reassignReason };

            if (isRecycled) {
                let parsedLogs = [];
                try {
                    if (typeof selectedLead.noResponseLogs === 'string') {
                        parsedLogs = JSON.parse(selectedLead.noResponseLogs);
                    } else if (Array.isArray(selectedLead.noResponseLogs)) {
                        parsedLogs = selectedLead.noResponseLogs;
                    }
                } catch (e) { parsedLogs = []; }

                [...parsedLogs].reverse().forEach(log => {
                    updatedHistory = appendHistory(
                        updatedHistory, 
                        `Archived Cycle: ${log.interaction || 'Attempt'}`, 
                        `Action: ${log.action || 'N/A'} | Notes: ${log.notes || 'None'} | Time: ${log.timestamp}`
                    );
                });

                assignPayload.history = JSON.stringify(updatedHistory);

                await apiFetch(`/leads/${selectedLead.id}/assign`, {
                    method: 'PUT',
                    body: JSON.stringify(assignPayload)
                });

                await apiFetch(`/leads/${selectedLead.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        followupCount: 0,
                        followUpCount: 0,
                        noResponseLogs: JSON.stringify([]),
                        status: assignPayload.status
                    })
                });
            } else {
                assignPayload.history = JSON.stringify(updatedHistory);

                await apiFetch(`/leads/${selectedLead.id}/assign`, {
                    method: 'PUT',
                    body: JSON.stringify(assignPayload)
                });
            }

            await fetchJobs(true);
            setIsReassignModalOpen(false); 
        } catch (error) { console.error('Reassign error:', error); }
    };

    const handleOpenEditModal = (lead, targetSection = null) => {
        setSelectedLead(lead);
        setRecordingTime(0);
        setIsRecording(false);
        setPlayingIndex(null);
        setEditingLogIndex(null); 

        setExpandedSections({
            leadInfo: false, 
            salesActivity: activeTab !== 'My Confirmation' && !targetSection, 
            travelDetails: false, 
            customisation: false,
            operationResponse: false, 
            bookingConfirmation: activeTab === 'My Confirmation', 
            paymentInfo: targetSection === 'paymentInfo'
        });

        let parsedNoResponseLogs = [];
        try {
            if (lead.noResponseLogs && lead.noResponseLogs !== '[object Object]') {
                parsedNoResponseLogs = typeof lead.noResponseLogs === 'string' ? JSON.parse(lead.noResponseLogs) : lead.noResponseLogs;
                if (!Array.isArray(parsedNoResponseLogs)) parsedNoResponseLogs = [];
            }
        } catch (e) { parsedNoResponseLogs = []; }

        let pHistory = [];
        try { pHistory = typeof lead.history === 'string' ? JSON.parse(lead.history) : (lead.history || []); } catch(e){}

        let parsedVoice = { customisation: [], sales: [], outcome: [] };
        if (lead.voiceBinaryFile) {
            try { 
                const parsed = JSON.parse(lead.voiceBinaryFile);
                if (Array.isArray(parsed)) {
                    parsedVoice.customisation = parsed;
                } else if (parsed && typeof parsed === 'object') {
                    parsedVoice.customisation = parsed.customisation || [];
                    parsedVoice.sales = parsed.sales || [];
                    parsedVoice.outcome = parsed.outcome || [];
                }
            }
            catch { parsedVoice.customisation = [{ url: lead.voiceBinaryFile, base64: lead.voiceBinaryFile }]; }
        } else if (Array.isArray(lead.voiceRecordings)) { 
            parsedVoice.customisation = lead.voiceRecordings; 
        }
        
        let parsedPaymentHistory = [];
        if (lead.paymentHistoryDetails) {
            try { parsedPaymentHistory = JSON.parse(lead.paymentHistoryDetails); }
            catch { parsedPaymentHistory = []; }
        } else if (Array.isArray(lead.paymentHistoryList)) { parsedPaymentHistory = lead.paymentHistoryList; }

        let parsedCustomisationRequests = [];
        if (lead.customisationRequests) {
            try { 
                const raw = typeof lead.customisationRequests === 'string' ? JSON.parse(lead.customisationRequests) : lead.customisationRequests; 
                if (Array.isArray(raw)) parsedCustomisationRequests = raw;
                else if (raw && typeof raw === 'object') parsedCustomisationRequests = [raw]; 
            } 
            catch { parsedCustomisationRequests = []; }
        }
        if (!parsedCustomisationRequests || parsedCustomisationRequests.length === 0) {
            parsedCustomisationRequests = [{
                destination: lead.customisationDestination || lead.destination || '', customisationType: lead.customisationType || '', requirements: lead.requirements || '',
                requiredByDate: lead.requiredByDate || '', assignedTo: lead.customisationAssignedTo || '', raiseRequest: lead.raiseRequest || 'No',
                readymadePackageDetails: lead.readymadePackageDetails || '', turnaroundTime: lead.turnaroundTime || '', status: lead.customisationStatus || 'Pending'
            }];
        }

        let parsedFiles = [];
        if (lead.docDriveLink) {
            try {
                parsedFiles = JSON.parse(lead.docDriveLink);
                if (!Array.isArray(parsedFiles)) parsedFiles = [];
            } catch {
                if (lead.docDriveLink.trim() !== '') {
                    parsedFiles = [{ name: 'Attached Link', url: lead.docDriveLink }];
                }
            }
        }

        let derivedActionTaken = lead.actionTaken || '';
        if (lead.status === 'Customisation Ready' || lead.status === 'Customization Required') {
            derivedActionTaken = 'Customisation Required';
        }

        let parsedServiceCosts = {};
        if (lead.serviceCosts) {
            try { parsedServiceCosts = typeof lead.serviceCosts === 'string' ? JSON.parse(lead.serviceCosts) : lead.serviceCosts; }
            catch { parsedServiceCosts = {}; }
        }

        setEditFormData({
            leadName: lead.customerName || lead.profileName || '', leadSource: lead.platform || 'Website', leadDate: formatDateTime(lead.createdAt || lead.dateAdded) || '',
            mobileNumber: lead.phone || lead.mobileNo || '', emailAddress: lead.email || '', assignedTo: lead.assignedTo || 'Unassigned',
            campaign: lead.campaign || 'Organic Search', packageType: lead.packageType || lead.type || 'B2C Enquiry', budget: lead.budget || lead.amount || '',
            messageFromLead: lead.leadMessage || lead.message || lead.notes || '', tourType: lead.tourType || '', destination: lead.destination || '',
            travelDate: lead.travelDate || lead.travelDates || lead.dates || '', duration: lead.duration || '', travelBudget: lead.travelBudget || lead.budget || lead.amount || '',
            hotelCategory: lead.hotelCategory || '', noOfAdults: lead.noOfAdults || lead.travellerCount || lead.noOfPax || '2', noOfChildren: lead.noOfChildren || '0', offers: lead.offers || '', departureCity: lead.departureCity || '',
            
            firstAttempt: lead.firstAttempt || '', leadResponse: lead.leadResponse || '', interactionType: lead.interactionType || '', actionTaken: derivedActionTaken,
            leadStatusField: lead.leadStatusField || '', salesNotes: '', outcomeNotes: '', followupDate: lead.nextFollowUp || lead.followupDate || '',
            leadTemperature: lead.leadTemperature || '', objectionTracking: lead.objectionTracking || '', customerResponse: lead.customerResponse || '',
            bookingProbability: lead.bookingProbability || '0%', closureReason: lead.closureReason || '', nextFollowUpDatePostponed: lead.nextFollowUpDatePostponed || '',
            noResponseLogs: parsedNoResponseLogs, history: pHistory, services: lead.services || '', remarks: lead.remarks || '', customisationRequests: parsedCustomisationRequests,
            
            opsPreparedBy: lead.opsPreparedBy || '', opsCompletedOn: lead.opsCompletedOn || '', opsRemarks: lead.opsRemarks || '', opsActionTaken: lead.opsActionTaken || '',
            opsVerificationStatus: lead.opsVerificationStatus || 'Pending Verified', opsSharedWithClient: lead.opsSharedWithClient || 'No', 
            packagePreparedFor: lead.packagePreparedFor || '', packageCost: lead.packageCost || '', operationNotes: lead.operationNotes || '', salesReviewStatus: lead.salesReviewStatus || '',

            billingName: lead.billingName || '', bookingDate: lead.bookingDate || '', operationExecutive: lead.operationExecutive || '',
            confirmedTripType: lead.confirmedTripType || lead.tripCategory || getDefaultTripType(lead), confirmedDestination: lead.confirmedDestination || lead.destination || '', confirmedDuration: lead.confirmedDuration || lead.duration || '',
            noOfPax: lead.noOfPax || lead.travellerCount || '', confirmedNoOfChildren: lead.confirmedNoOfChildren || lead.noOfChildren || '0', transportMode: lead.transportMode || '',
            departureDate: lead.departureDate || '', tourStartDate: lead.tourStartDate || '', returnDate: lead.returnDate || '', travelEndDate: lead.travelEndDate || '', tourEndDate: lead.tourEndDate || lead.travelEndDate || '',
            totalPackageCost: lead.totalPackageCost || lead.amount || lead.budget || '', specialOffers: lead.specialOffers || '', arrivalDate: lead.arrivalDate || '', flightStatus: lead.flightStatus || '',
            visaStatus: lead.visaStatus || '', insuranceStatus: lead.insuranceStatus || '', confirmedMethod: lead.confirmedMethod || '', confirmedDate: lead.confirmedDate || '',
            confirmedServices: lead.confirmedServices || '', discount: lead.discount || '', finalPackageValue: lead.finalPackageValue || '', serviceCost: lead.serviceCost || '',
            
            service1Cost: lead.service1Cost || '', service2Cost: lead.service2Cost || '', service3Cost: lead.service3Cost || '', serviceCosts: parsedServiceCosts,
            gst: lead.gstStatus || lead.gstInclusion || '', tcs: lead.tcsStatus || lead.tcsInclusion || '',
            passengers: lead.passengers ? (typeof lead.passengers === 'string' ? JSON.parse(lead.passengers) : lead.passengers) : [],
            aadharCopy: lead.docAadhar || '', passportCopy: lead.docPassport || '', photograph: lead.docPhoto || '', docRemarks: lead.docRemarks || '',
            attachedFiles: parsedFiles,

            paymentDueDate: lead.paymentDueDate || '', transactionId: lead.transactionId || '', amountReceived: lead.amountReceived || '', paymentMode: lead.paymentMode || '', customerPaymentDate: '',
            nextPaymentDate: lead.nextPaymentDate || '', paymentStatus: lead.paymentStatus || '', paymentHistoryDetails: lead.paymentHistoryDetails || '', 
            
            voiceRecordings: parsedVoice.customisation, salesVoiceRecordings: parsedVoice.sales, outcomeVoiceRecordings: parsedVoice.outcome,
            
            leadStatus: lead.status || 'Jobs', gstInclusion: lead.gstInclusion || '', tcsInclusion: lead.tcsInclusion || '', paymentService: lead.paymentService || '', paymentHistoryList: parsedPaymentHistory,
            
            followUpCount: parsedNoResponseLogs.length, followUpType: lead.followUpType || '', followupAction: lead.followupAction || ''
        });
        
        setIsEditModalOpen(true);

        if (targetSection) {
            setTimeout(() => {
                const sectionEl = document.getElementById(`section-${targetSection}`);
                if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    };

    const handlePaymentSearchSelect = (lead) => {
        setIsPaymentSearchModalOpen(false);
        setPaymentSearchQuery('');
        handleOpenEditModal(lead, 'paymentInfo');
    };

    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        try {
            const isOutcome = editFormData.leadResponse === 'Requirement Collected';
            const pendingNotes = isOutcome ? editFormData.outcomeNotes : editFormData.salesNotes;
            
            let updatedLogs = [...(editFormData.noResponseLogs || [])];
            let logsCount = editFormData.followUpCount;
            let currentHistory = editFormData.history;

            if (pendingNotes) {
                const currentInteraction = isOutcome ? 'Sales Track Update' : (editFormData.interactionType || 'Direct Submit');
                const currentAction = isOutcome ? (editFormData.customerResponse || 'Updated') : (editFormData.actionTaken || 'Updated');
                const newEntry = { timestamp: formatDateTime(new Date().toISOString()), interaction: currentInteraction, action: currentAction, notes: pendingNotes };
                updatedLogs.push(newEntry);
                logsCount = updatedLogs.length;
                currentHistory = appendHistory(currentHistory, `${isOutcome ? 'Outcome Update' : 'Follow-up'}: ${currentInteraction}`, pendingNotes);
            }

            let finalStatus = editFormData.leadStatus;
            
            if (logsCount >= 10) finalStatus = 'Recycle Bin';

            if (editFormData.actionTaken === 'Customisation Required' && finalStatus !== 'Recycle Bin' && finalStatus !== 'Move To Operation') {
                finalStatus = 'Customization Required';
            } else if ((finalStatus === 'Customization Required' || finalStatus === 'Customisation Ready') && editFormData.actionTaken !== 'Customisation Required') {
                finalStatus = 'Sales Assigned';
            }

            if (activeTab === 'My Confirmation' && editFormData.operationExecutive) {
                finalStatus = 'Move To Operation';
            }

            let updatedHistory = appendHistory( currentHistory, `Lead Profile Updated`, `Status: ${editFormData.leadStatusField || finalStatus} | Stage: ${editFormData.leadResponse || 'N/A'}` );

            if (finalStatus === 'Recycle Bin' && logsCount > 0) {
                updatedHistory = appendHistory(updatedHistory, 'Auto-Moved to Recycle Bin', `Archived ${logsCount} attempts. Follow-up counter reset to 0.`);
                [...updatedLogs].reverse().forEach(log => {
                    updatedHistory = appendHistory(
                        updatedHistory, 
                        `Archived Cycle: ${log.interaction || 'Attempt'}`, 
                        `Action: ${log.action || 'N/A'} | Notes: ${log.notes || 'None'} | Time: ${log.timestamp}`
                    );
                });
                updatedLogs = [];
                logsCount = 0;
            }

            const combinedVoice = {
                customisation: editFormData.voiceRecordings || [],
                sales: editFormData.salesVoiceRecordings || [],
                outcome: editFormData.outcomeVoiceRecordings || []
            };

            const payload = {
                ...editFormData,
                customerName: editFormData.leadName,
                profileName: editFormData.leadName,
                phone: editFormData.mobileNumber,
                mobileNo: editFormData.mobileNumber,
                email: editFormData.emailAddress,
                platform: editFormData.leadSource,
                campaign: editFormData.campaign,
                packageType: editFormData.packageType,
                type: editFormData.packageType,
                budget: editFormData.travelBudget || editFormData.budget,
                amount: editFormData.travelBudget || editFormData.budget,
                budgetRange: editFormData.travelBudget || editFormData.budget,
                message: editFormData.messageFromLead,
                leadMessage: editFormData.messageFromLead,
                travelDates: editFormData.travelDate,
                dates: editFormData.travelDate,
                noOfPax: editFormData.noOfAdults,
                travellerCount: editFormData.noOfAdults,
                nextFollowUp: editFormData.followupDate, 
                packageCost: editFormData.totalPackageCost || editFormData.packageCost, 
                offers: editFormData.specialOffers || editFormData.offers, 
                noOfChildren: editFormData.confirmedNoOfChildren || editFormData.noOfChildren,

                service1Cost: editFormData.service1Cost,
                service2Cost: editFormData.service2Cost,
                service3Cost: editFormData.service3Cost,
                serviceCosts: Object.keys(editFormData.serviceCosts || {}).length ? JSON.stringify(editFormData.serviceCosts) : null,
                gstStatus: editFormData.gst,
                tcsStatus: editFormData.tcs,
                passengers: editFormData.passengers?.length ? JSON.stringify(editFormData.passengers) : null,
                docAadhar: editFormData.aadharCopy,
                docPan: editFormData.pancard,
                docPassport: editFormData.passportCopy,
                docPhoto: editFormData.photograph,
                docDriveLink: editFormData.attachedFiles?.length ? JSON.stringify(editFormData.attachedFiles) : null,
                docRemarks: editFormData.docRemarks,
                
                noResponseLogs: updatedLogs.length ? JSON.stringify(updatedLogs) : null,
                followupCount: logsCount,
                followUpCount: logsCount,
                
                voiceBinaryFile: JSON.stringify(combinedVoice),
                paymentHistoryDetails: editFormData.paymentHistoryList?.length ? JSON.stringify(editFormData.paymentHistoryList) : null,
                
                customisationRequests: editFormData.customisationRequests?.length ? JSON.stringify(editFormData.customisationRequests) : null,
                customisationDestination: editFormData.customisationRequests?.[0]?.destination || '', 
                customisationType: editFormData.customisationRequests?.[0]?.customisationType || '',
                requirements: editFormData.customisationRequests?.[0]?.requirements || '', 
                requiredByDate: editFormData.customisationRequests?.[0]?.requiredByDate || '',
                customisationAssignedTo: editFormData.customisationRequests?.[0]?.assignedTo || '', 
                raiseRequest: editFormData.customisationRequests?.[0]?.raiseRequest || 'No',
                readymadePackageDetails: editFormData.customisationRequests?.[0]?.readymadePackageDetails || '', 
                turnaroundTime: editFormData.customisationRequests?.[0]?.turnaroundTime || '',
                customisationStatus: editFormData.customisationRequests?.[0]?.status || 'Pending',
                
                status: finalStatus, 
                history: JSON.stringify(updatedHistory)
            };
            
            await apiFetch(`/leads/${selectedLead.id}`, {
                method: 'PUT', body: JSON.stringify(payload)
            });
            await fetchJobs(true);
            setIsEditModalOpen(false);
        } catch (error) { console.error('Edit submit error:', error); alert(`Update failed: ${error.message || 'Network error while updating lead.'}`); }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleOpenAssignModal = (lead) => { setSelectedLead(lead); setAssignTo(''); setIsAssignModalOpen(true); };

    const handleAssignSubmit = async () => {
        if (!assignTo) { alert('Please select a team or choose self assignment.'); return; }
        try {
            const finalAssignee = assignTo === 'Self Assigned' ? loggedInUserName : assignTo;
            let updatedHistory = selectedLead.history || [];
            const isRecycled = selectedLead.status === 'Recycle Bin' || selectedLead.followupCount >= 10 || selectedLead.followUpCount >= 10;
            
            let assignPayload = { 
                assignedTo: finalAssignee, 
                status: 'Sales Assigned'
            };

            if (isRecycled) {
                updatedHistory = appendHistory(updatedHistory, `Recovered & Assigned to ${finalAssignee}`, 'Restored from Recycle Bin. Follow-up counter reset to 0.');
                
                let parsedLogs = [];
                try {
                    if (typeof selectedLead.noResponseLogs === 'string') {
                        parsedLogs = JSON.parse(selectedLead.noResponseLogs);
                    } else if (Array.isArray(selectedLead.noResponseLogs)) {
                        parsedLogs = selectedLead.noResponseLogs;
                    }
                } catch (e) { parsedLogs = []; }

                [...parsedLogs].reverse().forEach(log => {
                    updatedHistory = appendHistory(
                        updatedHistory, 
                        `Archived Cycle: ${log.interaction || 'Attempt'}`, 
                        `Action: ${log.action || 'N/A'} | Notes: ${log.notes || 'None'} | Time: ${log.timestamp}`
                    );
                });

                assignPayload.history = JSON.stringify(updatedHistory);

                await apiFetch(`/leads/${selectedLead.id}/assign`, {
                    method: 'PUT',
                    body: JSON.stringify(assignPayload)
                });
                
                await apiFetch(`/leads/${selectedLead.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        followupCount: 0,
                        followUpCount: 0,
                        noResponseLogs: JSON.stringify([]),
                        status: 'Sales Assigned'
                    })
                });

            } else {
                updatedHistory = appendHistory(updatedHistory, `Assigned to ${finalAssignee}`, 'Lead claimed/assigned from pool.');
                assignPayload.history = JSON.stringify(updatedHistory);

                await apiFetch(`/leads/${selectedLead.id}/assign`, {
                    method: 'PUT',
                    body: JSON.stringify(assignPayload)
                });
            }
            
            await fetchJobs(true);
            setIsAssignModalOpen(false); 
        } catch (error) { console.error('Assign error:', error); }
    };

    const handleOpenHandoverModal = (lead = null) => {
        setHandoverLead(lead);
        setHandoverLeadId(lead ? lead.id : '');
        setHandoverTarget('');
        setHandoverNotes('');
        setHandoverOption('employee');
        setIsHandoverModalOpen(true);
    };

    const handleHandoverSubmit = async () => {
        const targetId = handoverLead ? handoverLead.id : handoverLeadId;
        
        if (!targetId) { 
            alert('Please select a job to handover.'); 
            return; 
        }
        if (handoverOption === 'employee' && !handoverTarget) { 
            alert('Please select an Operations Executive to assign this to.'); 
            return; 
        }

        const leadToUpdate = handoverLead || jobs.find(j => j.id == targetId);
        if (!leadToUpdate) return;

        try {
            const isPool = handoverOption === 'pool';
            let updatedHistory = appendHistory(
                leadToUpdate.history || [], 
                'Moved to Operations', 
                isPool
                    ? `Shared to Operations common jobs pool. Notes: ${handoverNotes || 'None'}`
                    : `Handed over to ${handoverTarget}. Notes: ${handoverNotes || 'None'}`
            );
            
            const payload = {
                status: 'Move To Operation',
                operationExecutive: isPool ? '' : handoverTarget,
                operationNotes: handoverNotes,
                history: JSON.stringify(updatedHistory)
            };

            await apiFetch(`/leads/${targetId}/assign`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            await fetchJobs(true);
            setIsHandoverModalOpen(false);
        } catch (error) {
            console.error('Handover error:', error);
            alert(`Failed to handover to operations: ${error.message || 'Network error.'}`);
        }
    };

    const categories = [
        { id: 'Jobs', label: 'JOBS', icon: ShoppingCart },
        { id: 'My Jobs', label: 'MY JOBS', icon: Target },
        { id: 'Customisation Ready', label: 'CUSTOMISATION READY', icon: RefreshCw },
        { id: 'My Confirmation', label: 'MY CONFIRMATION', icon: CheckSquare },
        { id: 'Recycle', label: 'RECYCLE LEADS', icon: Trash2 },
    ];

    const customisationReadyRows = jobs.flatMap(item => {
        const itemStatus = item.status || 'Jobs';
        const isRecycleBin = (item.followupCount >= 10 || item.followUpCount >= 10 || itemStatus === 'Recycle Bin');
        if (isRecycleBin) return [];
        if (itemStatus !== 'Shared to Sales' && itemStatus !== 'Customisation Ready') return [];

        let parsedRequests = [];
        if (item.customisationRequests) {
            try {
                const raw = typeof item.customisationRequests === 'string' ? JSON.parse(item.customisationRequests) : item.customisationRequests;
                if (Array.isArray(raw)) parsedRequests = raw;
                else if (raw && typeof raw === 'object') parsedRequests = [raw];
            } catch { parsedRequests = []; }
        }

        const readyIndices = parsedRequests.reduce((acc, r, idx) => { if (r.status === 'Customisation Ready') acc.push(idx); return acc; }, []);

        if (readyIndices.length === 0) {
            return [{ ...item, uniqueKey: `${item.id}-0`, reqIndex: 0 }];
        }

        return readyIndices.map(idx => {
            const req = parsedRequests[idx];
            return {
                ...item,
                uniqueKey: `${item.id}-${idx}`,
                reqIndex: idx,
                destination: req.destination || item.destination,
                packagePreparedFor: req.packagePreparedFor || item.packagePreparedFor,
                packageCost: req.packageCost || item.packageCost,
                operationNotes: req.operationNotes || item.operationNotes,
                opsCompletedOn: req.opsCompletedOn || item.opsCompletedOn,
            };
        });
    });

    const filteredData = (activeTab === 'Customisation Ready' ? customisationReadyRows : jobs).filter(item => {
        const displayId = `LMN${item.id || ''}`.toLowerCase();
        const name = (item.customerName || item.profileName || '').toLowerCase();
        const dest = (item.destination || '').toLowerCase();
        const phoneStr = (item.phone || item.mobileNo || '').toLowerCase();

        const matchName = name.includes(searchName.toLowerCase());
        const matchId = displayId.includes(searchId.toLowerCase());
        const matchPhone = phoneStr.includes(searchPhone.toLowerCase());
        const matchDest = dest.includes(searchDestination.toLowerCase());
        const matchSearch = matchName && matchId && matchPhone && matchDest;

        const matchPlatform = selectedPlatform === 'All' || (item.platform || 'Website') === selectedPlatform;
        
        const itemStatus = item.status || 'Jobs';
        let matchTab = false;
        
        const isRecycleBin = (item.followupCount >= 10 || item.followUpCount >= 10 || itemStatus === 'Recycle Bin');

        if (activeTab === 'Recycle') matchTab = isRecycleBin;
      else if (isRecycleBin) matchTab = false; 
        else if (activeTab === 'My Jobs') {
            const isUnassigned = !item.assignedTo || item.assignedTo === 'Unassigned';
            const leftSalesPipeline = itemStatus === 'Jobs' || itemStatus === 'Move To Operation' || isUnassigned;
            
            const isRegularSalesJob = !leftSalesPipeline && (isAdmin || item.assignedTo === loggedInUserName);
            const isMyCustomisationReady = (itemStatus === 'Shared to Sales' || itemStatus === 'Customisation Ready') && (isAdmin || item.assignedTo === loggedInUserName);
            const isMyConfirmation = item.customerResponse === 'Booking Confirmed' && (isAdmin || item.assignedTo === loggedInUserName);
            matchTab = isRegularSalesJob || isMyCustomisationReady || isMyConfirmation;
        } 
        else if (activeTab === 'Customisation Ready') { 
            matchTab = true; 
        } 
        else if (activeTab === 'My Confirmation') { 
            matchTab = item.customerResponse === 'Booking Confirmed' && (isAdmin || item.assignedTo === loggedInUserName); 
        }
        else if (activeTab === 'Jobs') { matchTab = itemStatus === 'Jobs' || !item.assignedTo || item.assignedTo === 'Unassigned'; }
    });

    const paymentSearchData = jobs.filter(item => {
        if (!paymentSearchQuery.trim()) return false;
        const q = paymentSearchQuery.toLowerCase();
        const displayId = `LMN${item.id || ''}`.toLowerCase();
        const name = (item.customerName || item.profileName || '').toLowerCase();
        const phoneStr = (item.phone || item.mobileNo || '').toLowerCase();
        return name.includes(q) || displayId.includes(q) || phoneStr.includes(q);
    });

    const probValue = parseInt(editFormData.bookingProbability) || 0;

    return (
        <div className="p-1 sm:p-4 lg:p-6 pt-20 sm:pt-24 lg:pt-24 w-full bg-[#0f172a] min-h-screen font-sans relative text-white">
            <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">SALES DASHBOARD</h1>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
                    <button type="button" onClick={handleOpenNewLeadModal}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-[#0f172a] font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-200">
                        <Plus size={18} strokeWidth={2.5} />
                        <span>Add New Lead</span>
                    </button>
                    <button type="button" onClick={() => setIsPaymentSearchModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-[#0f172a] font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200">
                        <CreditCard size={18} strokeWidth={2.5} />
                        <span>Add New Payment</span>
                    </button>
                    {activeTab === 'My Confirmation' && (
                        <button type="button" onClick={() => handleOpenHandoverModal(null)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-purple-500 hover:bg-purple-400 active:bg-purple-600 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-purple-500/20 transition-all duration-200">
                            <Send size={18} strokeWidth={2.5} />
                            <span>Handover to Ops</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeTab === cat.id;
                    const count = cat.id === 'Customisation Ready' ? customisationReadyRows.length : jobs.filter(d => {
                        const itemStatus = d.status || 'Jobs';
                        const isRecycleBin = (d.followupCount >= 10 || d.followUpCount >= 10 || itemStatus === 'Recycle Bin');
                        if (cat.id === 'Recycle') return isRecycleBin;
                        if (isRecycleBin) return false;

                       const isUnassigned = !d.assignedTo || d.assignedTo === 'Unassigned';
                        const leftSalesPipeline = itemStatus === 'Jobs' || itemStatus === 'Move To Operation' || isUnassigned;
                        
                        if (cat.id === 'My Jobs') {
                            const isRegularSalesJob = !leftSalesPipeline && (isAdmin || d.assignedTo === loggedInUserName);
                            const isMyCustomisationReady = (itemStatus === 'Shared to Sales' || itemStatus === 'Customisation Ready') && (isAdmin || d.assignedTo === loggedInUserName);
                            const isMyConfirmation = d.customerResponse === 'Booking Confirmed' && (isAdmin || d.assignedTo === loggedInUserName);
                            return isRegularSalesJob || isMyCustomisationReady || isMyConfirmation;
                        }
                        if (cat.id === 'My Confirmation') return d.customerResponse === 'Booking Confirmed' && (isAdmin || d.assignedTo === loggedInUserName);
                        if (cat.id === 'Jobs') return itemStatus === 'Jobs' || isUnassigned;
                        return itemStatus === cat.id;
                    }).length;
                    
                    return (
                        <div key={cat.id} onClick={() => setActiveTab(cat.id)} className={`relative p-5 rounded-xl cursor-pointer transition-all duration-200 border shadow-sm hover:shadow-md flex flex-col justify-between h-full min-h-[130px] ${isActive ? 'ring-2 ring-offset-2 border-slate-500 bg-[#07202a] text-white' : 'bg-transparent border-slate-700/20 text-slate-200'}`}>
                            <div className="flex justify-between items-start w-full">
                                <div className={`p-3 rounded-xl ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-800/40 text-slate-300'}`}>
                                    <Icon size={24} strokeWidth={2} />
                                </div>
                                <span className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-slate-200'}`}>{count}</span>
                            </div>
                            <h3 className={`font-semibold text-sm text-left mt-auto pt-4 capitalize ${isActive ? 'text-cyan-400' : 'text-slate-300'}`}>{cat.label.toLowerCase()}</h3>
                            {isActive && <div className="absolute bottom-0 left-0 w-full h-1 rounded-b-xl bg-slate-700" />}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-1 mb-6 md:hidden">
                <button type="button" onClick={() => scrollTabs(-1)} className="flex-shrink-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 cursor-pointer"><ChevronLeft size={16} /></button>
                <div ref={tabScrollRef} className="flex gap-2 overflow-x-auto flex-1 items-stretch" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {categories.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = activeTab === cat.id;
                        const count = cat.id === 'Customisation Ready' ? customisationReadyRows.length : jobs.filter(d => {
                            const itemStatus = d.status || 'Jobs';
                            const isRecycleBin = (d.followupCount >= 10 || d.followUpCount >= 10 || itemStatus === 'Recycle Bin');
                            if (cat.id === 'Recycle') return isRecycleBin;
                            if (isRecycleBin) return false;

                        const isUnassigned = !d.assignedTo || d.assignedTo === 'Unassigned';
                            const leftSalesPipeline = itemStatus === 'Jobs' || itemStatus === 'Move To Operation' || isUnassigned;
                            
                            if (cat.id === 'My Jobs') {
                                const isRegularSalesJob = !leftSalesPipeline && (isAdmin || d.assignedTo === loggedInUserName);
                                const isMyCustomisationReady = (itemStatus === 'Shared to Sales' || itemStatus === 'Customisation Ready') && (isAdmin || d.assignedTo === loggedInUserName);
                                const isMyConfirmation = d.customerResponse === 'Booking Confirmed' && (isAdmin || d.assignedTo === loggedInUserName);
                                return isRegularSalesJob || isMyCustomisationReady || isMyConfirmation;
                            }
                            if (cat.id === 'My Confirmation') return d.customerResponse === 'Booking Confirmed' && (isAdmin || d.assignedTo === loggedInUserName);
                            if (cat.id === 'Jobs') return itemStatus === 'Jobs' || isUnassigned;
                            return itemStatus === cat.id;
                        }).length;

                        return (
                            <div key={cat.id} onClick={() => setActiveTab(cat.id)} className={`relative flex-shrink-0 flex flex-col justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${isActive ? 'ring-1 ring-cyan-500 border-cyan-700 bg-[#07202a] text-white' : 'bg-slate-800/30 border-slate-700/30 text-slate-300'}`} style={{ minWidth: '140px', minHeight: '105px' }}>
                                <div className="flex justify-between items-start w-full">
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${isActive ? 'bg-slate-700 text-cyan-400' : 'bg-slate-800/80 text-slate-400'}`}>
                                        <Icon size={18} strokeWidth={2} />
                                    </div>
                                    <span className={`text-xl font-bold leading-none ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>{count}</span>
                                </div>
                                <span className={`text-sm font-semibold text-left mt-auto pt-3 break-words capitalize ${isActive ? 'text-white' : 'text-slate-300'}`}>{cat.label.toLowerCase()}</span>
                                {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 rounded-b-xl bg-cyan-500" />}
                            </div>
                        );
                    })}
                </div>
                <button type="button" onClick={() => scrollTabs(1)} className="flex-shrink-0 p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:bg-slate-700 cursor-pointer"><ChevronRight size={16} /></button>
            </div>

            <div className="flex flex-col gap-3 w-full mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" placeholder="Search Name..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className={`${inputCls} pl-8`} />
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" placeholder="Search ID..." value={searchId} onChange={(e) => setSearchId(e.target.value)} className={`${inputCls} pl-8`} />
                    </div>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" placeholder="Search Phone..." value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} className={`${inputCls} pl-8`} />
                    </div>
                    
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)} className={`${selectCls} pl-8`}>
                            <option value="All">All Platforms</option>
                            {PLATFORM_OPTIONS.map(p => ( <option key={p} value={p}>{p}</option> ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-transparent sm:bg-slate-900/30 border-none sm:border border-slate-700/30 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-0 sm:p-5 border-b-0 sm:border-b border-slate-700/20 gap-4 mb-4 sm:mb-0">
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center justify-between sm:justify-start">
                        <span className="truncate pr-2">{categories.find(c => c.id === activeTab)?.label || activeTab}</span>
                        <span className="text-slate-400 font-normal text-sm sm:text-base whitespace-nowrap bg-slate-800/50 sm:bg-transparent px-2 py-0.5 rounded-full sm:px-0 sm:ml-2">({filteredData.length} records)</span>
                    </h2>
                </div>

                <div className="overflow-x-auto custom-scrollbar w-full">
                    <table className="w-full text-left text-sm sm:text-base text-slate-200 block md:table">
                     <thead className="bg-slate-900/80 border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400 font-semibold hidden md:table-header-group">
    {(activeTab === 'Jobs' || activeTab === 'Recycle') && (
        <tr>
            <th className="px-4 py-4">Job Id</th>
            <th className="px-4 py-4">Customer Info</th>
            <th className="px-4 py-4">Business Requirement</th>
            <th className="px-4 py-4">Requirement & Budget</th>
            <th className="px-4 py-4">Requirement Details</th>
            <th className="px-4 py-4">Lead Source</th>
            <th className="px-4 py-4">Lead Date</th>
            <th className="px-4 py-4 text-center">Action</th>
        </tr>
    )}
    {activeTab === 'My Jobs' && (
        <tr>
            <th className="px-4 py-4">Job Id</th>
            <th className="px-4 py-4">Customer Info</th>
            <th className="px-4 py-4">Business Requirement</th>
            <th className="px-4 py-4">Lead Source</th>
            <th className="px-4 py-4">Lead Date</th>
            <th className="px-4 py-4">Lead Status</th>
            <th className="px-4 py-4">Follow-up Date</th>
            <th className="px-4 py-4">Priority</th>
            <th className="px-4 py-4 text-center">Action</th>
        </tr>
    )}
    {activeTab === 'Customisation Ready' && (
        <tr>
            <th className="px-4 py-4">Job Id</th>
            <th className="px-4 py-4">Customer Info</th>
            <th className="px-4 py-4">Business Requirement</th>
            <th className="px-4 py-4">Shared Date</th>
            <th className="px-4 py-4">Sales Stage</th>
            <th className="px-4 py-4">Response</th>
            <th className="px-4 py-4">Follow-up Date</th>
            <th className="px-4 py-4">Priority</th>
            <th className="px-4 py-4 text-center">Action</th>
        </tr>
    )}
    {activeTab === 'My Confirmation' && (
        <tr>
            <th className="px-4 py-4">Job Id</th>
            <th className="px-4 py-4">Customer Info</th>
            <th className="px-4 py-4">Business Requirement</th>
            <th className="px-4 py-4">Confirmed Date</th>
            <th className="px-4 py-4">Confirmed Method</th>
            <th className="px-4 py-4">Value</th>
            <th className="px-4 py-4 text-center">Action</th>
        </tr>
    )}
</thead>
                        
                        <tbody className="block md:table-row-group divide-y-0 md:divide-y divide-slate-700/30">
                            {isLoading ? (
                                <tr className="block md:table-row"><td colSpan="12" className="block md:table-cell px-4 py-12 text-center text-slate-500">Loading records...</td></tr>
                            ) : filteredData.length > 0 ? filteredData.map(row => (
                                <tr key={row.uniqueKey || row.id} className="block md:table-row bg-[#1e293b] md:bg-transparent border border-slate-700 md:border-none rounded-xl mb-4 md:mb-0 p-3 sm:p-4 md:p-0 hover:bg-slate-800/40 transition-colors shadow-sm md:shadow-none group relative">

                                    {(activeTab === 'Jobs' || activeTab === 'Recycle') && (
                                        <>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Job Id</span>
                                                <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1"><span className="hidden sm:inline">📞</span> {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px] sm:max-w-none">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 truncate max-w-[150px] sm:max-w-none text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Type/Budget</span>
                                                <div className="flex flex-col items-end md:items-start text-sm gap-1.5">
                                                    <span className="text-purple-300 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-900/40 text-[10px] sm:text-xs whitespace-nowrap">{row.typeOfTour || row.packageType || 'Tour'}</span>
                                                    <span className="font-semibold text-slate-200">{row.budgetRange || row.budget || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="flex flex-col md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mb-1">Message</span>
                                                <div className="text-sm text-slate-400 truncate max-w-full md:max-w-[180px] italic" title={row.leadMessage}>{row.leadMessage ? `"${row.leadMessage}"` : '—'}</div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Source</span>
                                                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-pink-950/30 text-pink-400 border border-pink-900/30 whitespace-nowrap">{row.platform || 'Website'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Lead Date</span>
                                                <span className="text-sm text-slate-400 whitespace-nowrap">{formatDateTime(row.createdAt || row.dateAdded)}</span>
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'My Jobs' && (
                                        <>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300 align-top">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Job Id</span>
                                                <div className="flex flex-col items-end md:items-start gap-1.5">
                                                    <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                                    {row.status && row.status !== 'Sales Assigned' && row.status !== 'Jobs' && (
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase whitespace-nowrap ${
                                                            row.status === 'Itinerary Shared' ? 'bg-purple-900/40 text-purple-400 border-purple-800/50' :
                                                            row.status === 'Follow-Up Required' ? 'bg-amber-900/40 text-amber-400 border-amber-800/50' :
                                                            row.status === 'Move To Operation' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50' :
                                                            row.status === 'Shared to Sales' ? 'bg-blue-900/40 text-blue-400 border-blue-800/50' :
                                                            'bg-slate-800 text-slate-400 border-slate-700'
                                                        }`}>
                                                            {row.status === 'Move To Operation' ? 'Operations' : row.status === 'Shared to Sales' ? 'Returned to Sales' : row.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px]">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Source</span>
                                                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-pink-950/30 text-pink-400 border border-pink-900/30">{row.platform || 'Website'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Lead Date</span>
                                                <span className="text-sm text-slate-400">{formatDateTime(row.createdAt || row.dateAdded)}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none w-full md:w-auto">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Lead Status</span>
                                                <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[11px] sm:text-xs font-medium whitespace-nowrap">
                                                    {row.leadStatusField || 'Yet to Connect'}
                                                </span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Next Followup</span>
                                                <span className="text-sm text-slate-300">{formatDMY(row.followupDate || row.nextFollowUp) || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Priority</span>
                                                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${row.priorityTimeline === 'High' ? 'bg-red-950 text-red-400 border border-red-900/50' : row.priorityTimeline === 'Medium' ? 'bg-amber-950 text-amber-400 border border-amber-900/50' : 'bg-blue-950 text-blue-400 border border-blue-900/50'}`}>
                                                    {row.priorityTimeline || 'Medium'}
                                                </span>
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'Customisation Ready' && (
                                        <>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Job Id</span>
                                                <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px]">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Shared Date</span>
                                                <span className="text-sm text-slate-300">{row.itinerarySharedDate || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none w-full md:w-auto">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Sales Stage</span>
                                                <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[11px] sm:text-xs font-medium whitespace-nowrap">
                                                    {row.salesStage || '—'}
                                                </span>
                                            </td>
                                            <td className="flex flex-col md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Response</span>
                                                <span className="text-[11px] sm:text-xs text-slate-400 truncate max-w-full md:max-w-[150px]" title={row.voiceMessageNotes}>{row.voiceMessageNotes || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Next Followup</span>
                                                <span className="text-sm text-slate-300">{formatDMY(row.followupDate) || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Priority</span>
                                                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${row.priorityTimeline === 'High' ? 'bg-red-950 text-red-400 border border-red-900/50' : 'bg-blue-950 text-blue-400 border border-blue-900/50'}`}>
                                                    {row.priorityTimeline || 'Medium'}
                                                </span>
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'My Confirmation' && (
                                        <>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none font-semibold text-slate-300">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Job Id</span>
                                                <span className="text-right md:text-left bg-slate-800 md:bg-transparent px-2 py-0.5 rounded md:px-0 md:py-0">LMN{row.id}</span>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Lead Info</span>
                                                <div className="flex flex-col items-end md:items-start text-right md:text-left">
                                                    <span className="text-white font-bold text-sm sm:text-base leading-tight mb-1">{row.customerName || row.profileName || 'N/A'}</span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">📞 {row.phone || row.mobileNo || 'N/A'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[150px]">{row.email || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-start md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase mt-0.5">Tour Details</span>
                                                <div className="flex flex-col items-end md:items-start text-sm">
                                                    <span className="text-emerald-400 font-medium mb-1 text-right md:text-left">{row.destination || 'Bali'}</span>
                                                    <span className="text-xs text-slate-400 whitespace-nowrap">📅 {row.travelDates || row.travelDate || 'TBD'}</span>
                                                    <span className="text-[11px] sm:text-xs text-slate-500">{row.noOfPax || row.travellerCount || '0'} pax</span>
                                                </div>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Confirmed Date</span>
                                                <span className="text-sm text-slate-300">{row.confirmedDate || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Method</span>
                                                <span className="text-sm text-slate-300">{row.confirmedMethod || '—'}</span>
                                            </td>
                                            <td className="flex justify-between items-center md:table-cell py-2.5 md:py-4 px-2 md:px-4 border-b border-slate-700/50 md:border-none">
                                                <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Value</span>
                                                <span className="text-sm font-bold text-emerald-400">{row.finalPackageValue ? `₹${row.finalPackageValue}` : '—'}</span>
                                            </td>
                                        </>
                                    )}

                                    <td className="flex justify-between items-center md:table-cell py-3 md:py-4 px-2 md:px-4 mt-1 md:mt-0 md:text-center whitespace-nowrap">
                                        <span className="md:hidden text-[11px] font-semibold text-slate-400 uppercase">Actions</span>
                                        <div className="flex items-center justify-end md:justify-center gap-1.5 sm:gap-2">
                                            <button type="button" onClick={() => { setSelectedLead(row); setExpandedStage(null); setIsHistoryModalOpen(true); }}
                                                className="p-2 md:p-1.5 text-purple-400 md:text-slate-400 hover:text-purple-400 bg-purple-500/10 md:bg-transparent hover:bg-purple-900/30 rounded-lg transition-colors" title="View History">
                                                <History size={18} />
                                            </button>
                                            <button type="button" onClick={() => { setSelectedLead(row); setIsViewModalOpen(true); }}
                                                className="p-2 md:p-1.5 text-blue-400 md:text-slate-400 hover:text-blue-300 bg-blue-500/10 md:bg-transparent hover:bg-blue-900/30 rounded-lg transition-colors" title="View Details">
                                                <Eye size={18} />
                                            </button>
                                            
                                            {activeTab !== 'Jobs' && activeTab !== 'Recycle' && (
                                                <button type="button" onClick={() => handleOpenEditModal(row)}
                                                    className="p-2 md:p-1.5 text-yellow-400 md:text-slate-400 hover:text-yellow-400 bg-yellow-500/10 md:bg-transparent hover:bg-yellow-900/30 rounded-lg transition-colors" title="Edit Details">
                                                    <Pencil size={18} />
                                                </button>
                                            )}

                                            {activeTab === 'My Confirmation' && (
                                                <button type="button" onClick={() => handleOpenHandoverModal(row)}
                                                    className="p-2 md:p-1.5 text-purple-400 md:text-slate-400 hover:text-purple-400 bg-purple-500/10 md:bg-transparent hover:bg-purple-900/30 rounded-lg transition-colors" title="Handover to Operations">
                                                    <Send size={18} />
                                                </button>
                                            )}
                                            
                                            {activeTab === 'My Jobs' && (
                                                <button type="button" onClick={() => handleOpenReassignModal(row)}
                                                    className="p-2 md:p-1.5 text-orange-400 md:text-slate-400 hover:text-orange-400 bg-orange-500/10 md:bg-transparent hover:bg-yellow-900/30 rounded-lg transition-colors" title="Reassign">
                                                    <RefreshCw size={18} />
                                                </button>
                                            )}
                                            {(activeTab === 'Jobs' || activeTab === 'Recycle' || activeTab === 'Customisation Ready') && (
                                                <button type="button" onClick={() => handleOpenAssignModal(row)}
                                                    className="p-2 md:p-1.5 text-orange-400 md:text-slate-400 hover:text-orange-400 bg-orange-500/10 md:bg-transparent hover:bg-orange-900/30 rounded-lg transition-colors" title="Assign">
                                                    <CheckSquare size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr className="block md:table-row">
                                    <td colSpan="12" className="block md:table-cell px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Target size={32} className="text-slate-600 mb-2" />
                                            <p className="text-sm sm:text-base font-medium text-slate-400">No records found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isPaymentSearchModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col relative text-slate-100 overflow-hidden min-h-[400px] max-h-[80vh]">
                        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                <CreditCard className="text-emerald-400" size={20} />
                                Search Lead for Payment
                            </h2>
                            <button type="button" onClick={() => setIsPaymentSearchModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search by Name, Phone, or ID..." 
                                    value={paymentSearchQuery} 
                                    onChange={(e) => setPaymentSearchQuery(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            
                            <div className="overflow-y-auto max-h-[40vh] custom-scrollbar pr-2 space-y-2">
                                {paymentSearchQuery.trim() === '' ? (
                                    <p className="text-center text-slate-500 text-sm py-8 italic">Type to search for a lead to add a payment.</p>
                                ) : paymentSearchData.length > 0 ? (
                                    paymentSearchData.map(lead => (
                                        <div 
                                            key={lead.id} 
                                            onClick={() => handlePaymentSearchSelect(lead)}
                                            className="p-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 rounded-lg cursor-pointer transition-colors flex justify-between items-center group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{lead.customerName || lead.profileName || 'Unknown'}</span>
                                                <span className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                                    <span>LMN{lead.id}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                    <span>📞 {lead.phone || lead.mobileNo || 'N/A'}</span>
                                                </span>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-500 text-sm py-8 italic">No leads found matching your search.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

          {isNewLeadModalOpen && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 backdrop-blur-sm">
                    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-24px)] sm:max-h-[90vh] flex flex-col relative text-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Add New Lead</h2>
                            <button type="button" onClick={() => setIsNewLeadModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0">
                                <X size={20} />
                            </button>
                        </div>

                        <form id="new-lead-form" onSubmit={handleNewLeadSubmit} onKeyDown={handlePreventEnterSubmit} className="px-6 py-6 overflow-y-auto flex-1 space-y-7 custom-scrollbar">
                            
                            {/* 1. CUSTOMER INFORMATION */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2 mb-3 uppercase tracking-widest text-xs">
                                    <Users size={16} className="text-violet-400" /> Customer Information
                                </h3>
                                <div className="border-t border-slate-800 pt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Customer Name</label>
                                            <input type="text" name="customerName" value={newLeadForm.customerName} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Mobile Number</label>
                                            <input type="tel" name="phone" value={newLeadForm.phone} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Email Address</label>
                                            <input type="email" name="email" value={newLeadForm.email} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Company Name (Optional)</label>
                                            <input type="text" name="companyName" value={newLeadForm.companyName} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. BUSINESS REQUIREMENT */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2 mb-3 uppercase tracking-widest text-xs">
                                    <MapPin size={16} className="text-emerald-400" /> Business Requirement
                                </h3>
                                <div className="border-t border-slate-800 pt-4 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Business Type</label>
                                            {renderNewLeadDropdown('businessType', newLeadForm.businessType, null, BUSINESS_TYPE_OPTIONS)}
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Requirement / Product</label>
                                            <input type="text" name="requirement" value={newLeadForm.requirement} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Budget</label>
                                            <input type="number" min="0" name="budget" value={newLeadForm.budget} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Expected Purchase Date</label>
                                            <input type="date" name="expectedPurchaseDate" value={newLeadForm.expectedPurchaseDate} onChange={handleNewLeadInputChange} className={`${inputCls} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Priority</label>
                                            {renderNewLeadDropdown('priority', newLeadForm.priority, null, PRIORITY_OPTIONS)}
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Requirement Details</label>
                                            <input type="text" name="requirementDetails" value={newLeadForm.requirementDetails} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. LEAD SOURCE */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2 mb-3 uppercase tracking-widest text-xs">
                                    <Target size={16} className="text-blue-400" /> Lead Source
                                </h3>
                                <div className="border-t border-slate-800 pt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Lead Source</label>
                                            {renderNewLeadDropdown('leadSource', newLeadForm.leadSource, null, LEAD_SOURCE_OPTIONS)}
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Source Details (Optional)</label>
                                            <input type="text" name="sourceDetails" value={newLeadForm.sourceDetails} onChange={handleNewLeadInputChange} className={inputCls} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. LEAD MANAGEMENT */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-2 mb-3 uppercase tracking-widest text-xs">
                                    <ClipboardList size={16} className="text-amber-400" /> Lead Management
                                </h3>
                                <div className="border-t border-slate-800 pt-4 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Lead Status</label>
                                            {renderNewLeadDropdown('leadStatus', newLeadForm.leadStatus, null, LEAD_STATUS_OPTIONS)}
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Follow-up Date</label>
                                            <input type="date" name="followupDate" value={newLeadForm.followupDate} onChange={handleNewLeadInputChange} className={`${inputCls} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`} />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 italic">New leads start unassigned in the Jobs pool — use the Assign action from the Jobs tab to hand this off to a salesperson.</p>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Notes</label>
                                        <textarea name="notes" value={newLeadForm.notes} onChange={handleNewLeadInputChange} rows={3} className="w-full px-3 py-2 sm:py-1.5 bg-slate-900 border border-slate-700 rounded-lg sm:rounded text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none resize-none custom-scrollbar transition-all" />
                                    </div>
                                </div>
                            </div>

                        </form>

                        <div className="px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                            <button type="button" onClick={() => setIsNewLeadModalOpen(false)} className="w-full sm:w-auto sm:flex-1 px-6 py-2.5 bg-transparent border border-slate-700 hover:bg-slate-800 cursor-pointer text-slate-300 text-sm font-semibold rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button type="submit" form="new-lead-form" disabled={isSubmittingNewLead || !newLeadForm.customerName.trim()}
                                className={`w-full sm:w-auto sm:flex-1 px-6 py-2.5 font-bold text-sm rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 border-none ${
                                    isSubmittingNewLead || !newLeadForm.customerName.trim() ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed shadow-none' : 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-[#0f172a] shadow-cyan-500/20 cursor-pointer'
                                }`}>
                                {isSubmittingNewLead ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Lead</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && selectedLead && (
                <div className="absolute inset-0 bg-[#0f172a] z-50 overflow-hidden flex flex-col w-full h-full text-slate-100">
                    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-800 flex justify-between items-center bg-[#0b1329] z-20 flex-shrink-0 shadow-md">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 truncate pr-4">
                                <Pencil size={20} className="text-orange-400 flex-shrink-0" />
                                <span className="truncate hidden sm:inline">
                                    {activeTab === 'My Confirmation' ? 'Booking Confirmation' : 'Edit Lead'}
                                </span>
                                <span className="text-sm font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-shrink-0">
                                    LMN{String(selectedLead?.id || '').padStart(4, '0')}
                                </span>
                            </h2>
                            
                            {activeTab !== 'My Confirmation' && (() => {
                                const temp = editFormData.leadTemperature || 'Cold';
                                const tempStyles = {
                                    Hot: { ring: '#f87171', badgeBg: 'from-red-500/15 to-transparent', badgeBorder: 'border-red-500/30', wrapBg: 'from-red-500/15 to-red-500/5', wrapBorder: 'border-red-500/30', pillBg: 'bg-red-500/15', pillBorder: 'border-red-500/35', pillText: 'text-red-300', glow: 'drop-shadow(0 0 5px rgba(248,113,113,0.55))', Icon: Flame },
                                    Warm: { ring: '#fb923c', badgeBg: 'from-orange-500/15 to-transparent', badgeBorder: 'border-orange-500/30', wrapBg: 'from-orange-500/15 to-orange-500/5', wrapBorder: 'border-orange-500/30', pillBg: 'bg-orange-500/15', pillBorder: 'border-orange-500/35', pillText: 'text-orange-300', glow: 'drop-shadow(0 0 5px rgba(251,146,60,0.55))', Icon: Sun },
                                    Cold: { ring: '#22d3ee', badgeBg: 'from-cyan-500/15 to-transparent', badgeBorder: 'border-cyan-500/30', wrapBg: 'from-cyan-500/15 to-cyan-500/5', wrapBorder: 'border-cyan-500/30', pillBg: 'bg-cyan-500/15', pillBorder: 'border-cyan-500/35', pillText: 'text-cyan-300', glow: 'drop-shadow(0 0 5px rgba(34,211,238,0.55))', Icon: Snowflake },
                                };
                                const s = tempStyles[temp] || tempStyles.Cold;
                                const circ = 2 * Math.PI * 18;

                                return (
                                    <div className={`flex items-center gap-3 pl-4 sm:ml-4 pr-4 py-1.5 rounded-2xl border-l sm:border sm:border-l-4 border-slate-700 ${temp !== 'Cold' || true ? `sm:bg-gradient-to-br sm:${s.badgeBg} sm:${s.badgeBorder}` : ''} transition-all duration-500`}>
                                        <div className={`relative w-13 h-13 flex items-center justify-center rounded-2xl bg-gradient-to-br ${s.wrapBg} border ${s.wrapBorder} transition-all duration-500`} style={{ width: 52, height: 52 }}>
                                            <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                                                <circle cx="22" cy="22" r="18" stroke="#1e293b" strokeWidth="3.5" fill="none" />
                                                <circle
                                                    cx="22" cy="22" r="18"
                                                    stroke={s.ring} strokeWidth="3.5" fill="none" strokeLinecap="round"
                                                    strokeDasharray={circ} strokeDashoffset={circ - (probValue / 100) * circ}
                                                    className="transition-all duration-1000 ease-out" style={{ filter: s.glow }}
                                                />
                                            </svg>
                                            <span className="absolute text-[11px] font-black font-mono" style={{ color: s.ring }}>{probValue}%</span>
                                        </div>
                                        <div className="flex flex-col justify-center gap-1">
                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Booking Probability</span>
                                            <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider w-max border ${s.pillBg} ${s.pillBorder} ${s.pillText}`}>
                                                <s.Icon size={11} strokeWidth={2.5} />
                                                {temp}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                        
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800 flex-shrink-0 ml-auto">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar w-full relative">
                        <form id="edit-lead-form" onSubmit={handleSubmitEdit} onKeyDown={handlePreventEnterSubmit} className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 w-full ">

                            {activeTab !== 'My Confirmation' && (
                                <>
                                    <div className={sectionCls} style={{ borderColor: 'rgba(51,65,85,0.8)' }}>
                                        <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('leadInfo')}>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`${sectionHeadCls} m-0`}>Lead Info</h3>
                                                    <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                                                        LMN{String(selectedLead?.id || '').padStart(4, '0')}
                                                        <Pencil size={11} className="text-slate-400" />
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded tracking-wider">Read-Only</span>
                                                {expandedSections.leadInfo ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                            </div>
                                        </div>
                                        {expandedSections.leadInfo && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
                                                {[
                                                    { label: 'Lead Date', name: 'leadDate' }, { label: 'Lead Source', name: 'leadSource' }, { label: 'Campaign', name: 'campaign' },
                                                    { label: 'Lead Name', name: 'leadName' }, { label: 'Mobile Number', name: 'mobileNumber' }, { label: 'Email Address', name: 'emailAddress' },
                                                    { label: 'Package Type', name: 'packageType' }, { label: 'Budget', name: 'budget' }, { label: 'Message From Lead', name: 'messageFromLead' },
                                                ].map(f => (
                                                    <div key={f.name}>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                                                        <input type="text" name={f.name} value={editFormData[f.name] || ''} readOnly className={readonlyCls} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className={sectionCls}>
                                        <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('salesActivity')}>
                                            <div className="flex items-center gap-3">
                                                <h3 className={`${sectionHeadCls} m-0`}>Sales Activity</h3>
                                                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                                                    <span className="text-slate-500">Follow-Up Count:</span>
                                                    <span className="font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 px-2 py-0.5 rounded-full min-w-[22px] text-center">
                                                        {editFormData.noResponseLogs?.length || 0}
                                                    </span>
                                                </div>
                                            </div>
                                            {expandedSections.salesActivity ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                        </div>
                                        {expandedSections.salesActivity && (
                                            <div className="mt-4 space-y-4">
                                                <div className="relative">
                                                    <div className={`grid grid-cols-1 ${editFormData.leadResponse === 'Requirement Collected' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 sm:gap-4 items-start`}>
                                                        <div>
                                                            <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Lead Response</label>
                                                            {renderDropdown('leadResponse', editFormData.leadResponse, '', ['No Response', 'Requirement Collected'], handleInputChange)}
                                                        </div>
                                                        <div>
                                                            <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Interaction Type</label>
                                                            {renderDropdown('interactionType', editFormData.interactionType, '', ['WhatsApp', 'Call', 'Email'], handleInputChange)}
                                                        </div>
                                                        {editFormData.leadResponse !== 'Requirement Collected' && (
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Action Taken</label>
                                                                {renderDropdown('actionTaken', editFormData.actionTaken, '', ['Sample Itinerary Shared', 'Follow-up Scheduled', 'Requirement Message Sent', 'Voice Note Sent','Promotional Offer Sent', 'Invalid Lead','Wrong Number','Others'], handleInputChange)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-4">
                                                        {renderDatePicker('followupDate', editFormData.followupDate, 'Next Follow-Up', handleInputChange)}
                                                        <div className="sm:col-span-2">
                                                            <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Notes</label>
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex gap-2 items-center">
                                                                    <input type="text" name="salesNotes" value={editFormData.salesNotes} onChange={handleInputChange} className={inputCls} placeholder="Notes..." />
                                                                    
                                                                    <button type="button" onClick={() => isRecording && recordingTypeRef.current === 'salesVoiceRecordings' ? stopRecording() : startRecording('salesVoiceRecordings')}
                                                                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap flex-shrink-0 transition-colors border-none cursor-pointer h-[34px] ${isRecording && recordingTypeRef.current === 'salesVoiceRecordings' ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}>
                                                                        {isRecording && recordingTypeRef.current === 'salesVoiceRecordings' ? <><Square size={12} fill="currentColor" /> ({formatTimer(recordingTime)})</> : <><Mic size={14} /> Voice</>}
                                                                    </button>

                                                                    <button type="button" onClick={() => handleLogNoResponse('interaction')} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap cursor-pointer h-[34px]">
                                                                        Save Log
                                                                    </button>
                                                                </div>
                                                                {renderVoiceList('salesVoiceRecordings')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsPreviousAttemptsModalOpen(true)}
                                                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        <History size={13} className="text-cyan-400" />
                                                        Previous Attempts
                                                        <span className="font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 px-1.5 py-0.5 rounded-full min-w-[18px] text-[10px] text-center">
                                                            {editFormData.noResponseLogs?.length || 0}
                                                        </span>
                                                    </button>
                                                </div>

                                                {isPreviousAttemptsModalOpen && (
                                                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm" onClick={() => setIsPreviousAttemptsModalOpen(false)}>
                                                        <div className="bg-[#0b1220] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col relative text-slate-100 overflow-hidden max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                                                            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
                                                                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                                                                    <History size={17} className="text-cyan-400" />
                                                                    Previous Attempts ({editFormData.noResponseLogs?.length || 0})
                                                                </h2>
                                                                <button type="button" onClick={() => setIsPreviousAttemptsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
                                                                    <X size={18} />
                                                                </button>
                                                            </div>
                                                            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar">
                                                                <div className="space-y-3">
                                                                    {editFormData.noResponseLogs && editFormData.noResponseLogs.length > 0 ? (
                                                                        editFormData.noResponseLogs.map((log, origIdx) => ({ log, origIdx })).reverse().map(({ log, origIdx }) => (
                                                                            <div key={origIdx} className="flex flex-col text-xs bg-[#0f172a] p-3 rounded-lg border border-slate-700/60 shadow-sm transition-all hover:bg-slate-800/80 group">
                                                                                {editingLogIndex === origIdx ? (
                                                                                    <div className="space-y-2">
                                                                                        <div className="flex justify-between items-center mb-1">
                                                                                            <span className="text-cyan-400 font-bold tracking-wide">{log.timestamp}</span>
                                                                                            <div className="flex gap-2">
                                                                                                <button type="button" onClick={() => handleEditLogSave(origIdx)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded border-none cursor-pointer text-[10px] font-bold transition-colors">Save</button>
                                                                                                <button type="button" onClick={handleEditLogCancel} className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded border-none cursor-pointer text-[10px] font-bold transition-colors">Cancel</button>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            <input type="text" value={editingLogData.interaction} onChange={e => setEditingLogData({...editingLogData, interaction: e.target.value})} className={inlineInputCls} placeholder="Interaction Type" />
                                                                                            <input type="text" value={editingLogData.action} onChange={e => setEditingLogData({...editingLogData, action: e.target.value})} className={inlineInputCls} placeholder="Action Taken" />
                                                                                        </div>
                                                                                        <textarea value={editingLogData.notes} onChange={e => setEditingLogData({...editingLogData, notes: e.target.value})} className={`${inlineInputCls} resize-none min-h-[40px]`} placeholder="Notes" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        <div className="flex justify-between items-start mb-2">
                                                                                            <span className="text-cyan-400 font-bold tracking-wide">{log.timestamp}</span>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="text-slate-300 px-2 py-0.5 bg-slate-900 rounded border border-slate-600 text-[10px] font-medium uppercase">
                                                                                                    {log.interaction || 'N/A'}
                                                                                                </span>
                                                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 ml-1">
                                                                                                    <button type="button" onClick={() => handleEditLogStart(origIdx, log)} className="text-blue-400 hover:text-blue-300 bg-transparent border-none cursor-pointer p-0 flex items-center" title="Edit Log">
                                                                                                        <Pencil size={13} />
                                                                                                    </button>
                                                                                                    <button type="button" onClick={() => handleDeleteLog(origIdx)} className="text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer p-0 flex items-center" title="Delete Log">
                                                                                                        <Trash2 size={13} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="text-slate-300 mt-0.5 space-y-1.5">
                                                                                            <div><span className="text-slate-500 font-medium">Action Taken:</span> <span className="text-slate-200">{log.action || 'None'}</span></div>
                                                                                            {log.notes && <div><span className="text-slate-500 font-medium">Notes:</span> <span className="text-slate-200">{log.notes}</span></div>}
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-center py-4 text-xs text-slate-500 italic border border-dashed border-slate-700/50 rounded-lg">
                                                                            No detailed logs recorded yet. Add notes and save to see history here.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {editFormData.leadResponse === 'Requirement Collected' && (
                                                    <div className="mt-6 pt-5 border-t border-slate-700/50">
                                                        <h4 className="text-sm font-bold text-cyan-400 mb-4 tracking-wider uppercase">SALES TRACK/ LEAD OUTCOME</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            {renderDatePicker('followupDate', editFormData.followupDate, 'Next Follow-Up', handleInputChange)}
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Customer Response</label>
                                                                {renderDropdown('customerResponse', editFormData.customerResponse, ' ', ['Booking Confirmed', 'Not Interested', 'Lead Lost', 'Negotiation', 'Client Follow-Up', 'Trip Postponed', 'Needs Revision' ], handleInputChange)}
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Notes</label>
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex gap-2">
                                                                        <input type="text" name="outcomeNotes" value={editFormData.outcomeNotes} onChange={handleInputChange} className={inputCls} placeholder="Notes..." />
                                                                        
                                                                        <button type="button" onClick={() => isRecording && recordingTypeRef.current === 'outcomeVoiceRecordings' ? stopRecording() : startRecording('outcomeVoiceRecordings')}
                                                                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap flex-shrink-0 transition-colors border-none cursor-pointer h-[34px] ${isRecording && recordingTypeRef.current === 'outcomeVoiceRecordings' ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}>
                                                                            {isRecording && recordingTypeRef.current === 'outcomeVoiceRecordings' ? <><Square size={12} fill="currentColor" /> ({formatTimer(recordingTime)})</> : <><Mic size={14} /> Voice</>}
                                                                        </button>

                                                                        <button type="button" onClick={() => handleLogNoResponse('outcome')} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap cursor-pointer h-[34px]">
                                                                            Save Log
                                                                        </button>
                                                                    </div>
                                                                    {renderVoiceList('outcomeVoiceRecordings')}
                                                                </div>
                                                            </div>
                                                            
                                                            {(editFormData.customerResponse === 'Not Interested' || editFormData.customerResponse === 'Lead Lost') && (
                                                                <div>
                                                                    <label className="block text-[11px] sm:text-xs font-medium text-orange-400 mb-1">Closure Reason</label>
                                                                    {renderDropdown('closureReason', editFormData.closureReason, ' ', ['Budget Issue', 'Competitor', 'No Response', 'VISA Rejected','Medical Emergency','Natural Disaster','Flight Unavailable','Internal Decision'], handleInputChange)}
                                                            </div>
                                                            )}

                                                            {(editFormData.customerResponse === 'Negotiation' || editFormData.customerResponse === 'Client Follow-Up') && (
                                                                <div>
                                                                    <label className="block text-[11px] sm:text-xs font-medium text-orange-400 mb-1">Objection Tracking</label>
                                                                    {renderDropdown('objectionTracking', editFormData.objectionTracking, ' ', ['Price High', 'Comparing Other Agents', 'Flight Cost', 'Hotel Cost','VISA Concerns','Travel Date Issue','Family Approval Pending','Need Leave Approval','Unexpected Situations','Safety Concerns'], handleInputChange)}
                                                                </div>
                                                            )}

                                                            {editFormData.customerResponse === 'Trip Postponed' && (
                                                                renderDatePicker('nextFollowUpDatePostponed', editFormData.nextFollowUpDatePostponed, 'Next Follow-Up Date', handleInputChange)
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                            </div>
                                        )}
                                    </div>

                                    <div className={sectionCls}>
                                        <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('travelDetails')}>
                                            <div className="flex flex-col gap-0.5">
                                                <h3 className={`${sectionHeadCls} m-0`}>Travel Details</h3>
                                            </div>
                                            {expandedSections.travelDetails ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                        </div>
                                        {expandedSections.travelDetails && (
                                            editFormData.leadResponse === 'Requirement Collected' ? (
                                                <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Destination</label>
                                                        <input type="text" name="destination" value={editFormData.destination} onChange={handleInputChange} className={inputCls} placeholder=" " />
                                                    </div>
                                                    {renderDatePicker('travelDate', editFormData.travelDate, 'Travel Date', handleInputChange)}
                                                   <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Duration</label>
                                                        {renderDropdown('duration', editFormData.duration, '', ['1 Day (Same Day Return)', '1N / 2D', '2N / 3D', '3N / 4D', '4N / 5D', '5N / 6D', '6N / 7D', '7N / 8D', '8N / 9D', '9N / 10D', '10-15 Days', '15+ Days'], handleInputChange)}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="w-1/2">
                                                            <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. Of Pax (Adults)</label>
                                                            <input type="number" name="noOfAdults" value={editFormData.noOfAdults} onChange={handleInputChange} className={inputCls} min="1" />
                                                        </div>
                                                        <div className="w-1/2">
                                                            <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. Of Pax (Children)</label>
                                                            <input type="number" name="noOfChildren" value={editFormData.noOfChildren} onChange={handleInputChange} className={inputCls} min="0" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Departure City</label>
                                                        <input type="text" name="departureCity" value={editFormData.departureCity} onChange={handleInputChange} className={inputCls} />
                                                    </div>
                                                   <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Budget</label>
                                                        {renderDropdown('travelBudget', editFormData.travelBudget, ' ', BUDGET_OPTIONS, handleInputChange)}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Package Type</label>
                                                        {renderDropdown('tourType', editFormData.tourType, ' ', ['Honeymoon', 'Family', 'Solo', 'Friends', 'Corporate', 'Group Tour', 'MICE'], handleInputChange)}
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Service </label>
                                                        {renderMultiSelect('services', editFormData.services, ['Tour Package', 'Flight Booking', 'VISA Booking', 'Hotel Booking Only', 'Local Transport', 'Travel Insurance' ])}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Hotel Category</label>
                                                        {renderDropdown('hotelCategory', editFormData.hotelCategory, ' ', [' 3-Star', ' 4-Star', ' 5-Star','Luxury','Boutique','Villa','Others'], handleInputChange)}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Offers</label>
                                                        {renderDropdown('offers', editFormData.offers, ' ', [{value: 'None', label: 'No Promo Applied'}, 'Early Bird 10% Discount', 'Free Airport Transfer Upgrade', {value: 'Complimentary Honeymoon Cake & Decor', label: 'Complimentary Honeymoon Cake & Decor'}, 'Others'], handleInputChange)}
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Action Taken</label>
                                                        {renderDropdown('actionTaken', editFormData.actionTaken, ' ', [ 'Customisation Required', 'Readymade Required'], handleInputChange)}
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Remarks</label>
                                                        <input type="text" name="remarks" value={editFormData.remarks} onChange={handleInputChange} className={inputCls} />
                                                    </div>
                                                </div>
                                                </>
                                            ) : (
                                                <div className="mt-4 px-4 py-5 text-xs sm:text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl text-center">
                                                    This section appears when Lead Response is "Requirement Collected".
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <div className={sectionCls}>
                                        <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('customisation')}>
                                            <h3 className={`${sectionHeadCls} m-0`}>CUSTOMISATION</h3>
                                            {expandedSections.customisation ? <ChevronDown size={18} className="text-cyan-400"/> : <ChevronRight size={18} className="text-slate-500"/>}
                                        </div>
                                        {expandedSections.customisation && (
                                            (editFormData.actionTaken === 'Customisation Required' || editFormData.customerResponse === 'Needs Revision') ? (
                                                <div className="mt-4">
                                                    <div className="space-y-4">
                                                        {editFormData.customisationRequests.map((req, index) => (
                                                            <div key={index} className="relative p-4 rounded-xl border border-slate-700/50 bg-slate-800/20">
                                                                {editFormData.customisationRequests.length > 1 && (
                                                                    <button type="button" onClick={() => removeCustomisationRequest(index)} className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1 bg-transparent border-none cursor-pointer">
                                                                        <X size={16} />
                                                                    </button>
                                                                )}
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                                                    <div>
                                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Destination</label>
                                                                        <input type="text" value={req.destination || ''} onChange={(e) => handleCustomisationChange(index, 'destination', e.target.value)} className={inputCls} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Customisation Type</label>
                                                                        {renderArrayDropdown('customisationType', req.customisationType, index, ' ', ['Complete Custom package', 'Existing Itinerary Modification', 'Hotel Change',   'Budget Optimisation', 'Add Activities','Remove Activities','Route Modification','Readymade Validation','Honeymoon Customisation','Family Customisation','Corporate Customisation','Revising Again','Other'])}
                                                                    </div>
                                                                    <div>
                                                                        {renderDatePicker(`turnoverTime_${index}`, req.turnaroundTime, 'Required By', (e) => handleCustomisationChange(index, 'turnaroundTime', e.target.value), '')}
                                                                    </div>
                                                                    <div className="md:col-span-3">
                                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Requirements</label>
                                                                        <div className="flex items-center gap-1.5 w-full">
                                                                            <input type="text" value={req.requirements || ''} onChange={(e) => handleCustomisationChange(index, 'requirements', e.target.value)} className={`${inputCls} flex-1`} placeholder="" />
                                                                            <button type="button" onClick={() => isRecording && recordingTypeRef.current === 'voiceRecordings' ? stopRecording() : startRecording('voiceRecordings')}
                                                                                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded whitespace-nowrap flex-shrink-0 transition-colors border-none cursor-pointer h-[38px] sm:h-[34px] ${isRecording && recordingTypeRef.current === 'voiceRecordings' ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-800 text-cyan-400 hover:bg-slate-700'}`}>
                                                                                {isRecording && recordingTypeRef.current === 'voiceRecordings' ? <><Square size={12} fill="currentColor" /> ({formatTimer(recordingTime)})</> : <><Mic size={14} /> Voice</>}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 flex justify-start">
                                                        <button type="button" onClick={addCustomisationRequest} className="text-xs sm:text-sm font-bold text-cyan-400 bg-transparent border-none hover:text-cyan-300 flex items-center gap-1 transition-colors px-2 py-1.5 rounded hover:bg-cyan-950/30 cursor-pointer">
                                                            <Plus size={14} /> Add Destination
                                                        </button>
                                                    </div>
                                                    
                                                    {renderVoiceList('voiceRecordings')}
                                                    
                                                    <div className="mt-6 pt-5 border-t border-slate-700/50">
                                                     <h4 className="text-sm font-bold text-cyan-400 tracking-wider uppercase mb-3">OPERATION RESPONSE</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Received Date & Time</label>
                                                                <input type="text" readOnly value={formatDateTime(editFormData.opsCompletedOn) || ''} className={`${readonlyCls} text-red-400 font-bold`} placeholder="Pending — awaiting Operations" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Package Prepared For</label>
                                                                <input type="text" name="packagePreparedFor" value={editFormData.packagePreparedFor || ''} readOnly className={readonlyCls} placeholder=" " />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-bold text-white mb-1">Prepared By</label>
                                                                <input type="text" readOnly value={editFormData.opsPreparedBy || ''} className={`${readonlyCls} text-red-400 text-[10px] sm:text-xs font-bold`} placeholder="Pending — awaiting Operations" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Package Cost</label>
                                                                <input type="text" name="packageCost" value={editFormData.packageCost || ''} readOnly className={readonlyCls} />
                                                            </div>
                                                            <div className="sm:col-span-2">
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Operation Notes</label>
                                                                <input type="text" name="operationNotes" value={editFormData.operationNotes || ''} readOnly className={readonlyCls} />
                                                            </div>
                                                        </div>
                                                        <div className="mt-5 pt-4 border-t border-slate-700/50">
                                                            <h4 className="text-sm font-bold text-cyan-400 tracking-wider uppercase mb-3">SALES REVIEW</h4>
                                                            <div className="w-full sm:w-1/3">
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Review Status</label>
                                                                {renderDropdown('salesReviewStatus', editFormData.salesReviewStatus, ' ', ['Verified & Shared', ' Clarification / Changes Needed', 'Rejected'], handleInputChange)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 px-4 py-5 text-xs sm:text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl text-center">
                                                    This section appears when Action Taken is "Customisation Required" or Customer Response is "Needs Revision".
                                                </div>
                                            )
                                        )}
                                    </div>
                                </>
                            )}

                            {activeTab === 'My Confirmation' && (
                                <div className={sectionCls}>
                                    <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('bookingConfirmation')}>
                                        <div className="flex flex-col gap-0.5">
                                            <h3 className={`text-sm sm:text-base font-bold tracking-wider uppercase m-0 flex items-center gap-2 ${editFormData.customerResponse === 'Booking Confirmed' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                {editFormData.customerResponse === 'Booking Confirmed' && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />}
                                                Booking Confirmation
                                            </h3>
                                        </div>
                                        {expandedSections.bookingConfirmation ? <ChevronDown size={18} className={editFormData.customerResponse === 'Booking Confirmed' ? "text-emerald-400" : "text-slate-500"}/> : <ChevronRight size={18} className="text-slate-500"/>}
                                    </div>
                                    
                                    {expandedSections.bookingConfirmation && (
                                        <div className="mt-4 space-y-8">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                                {(() => {
                                                    return (
                                                        <>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Confirmed Method</label>
                                                                {renderDropdown('confirmedMethod', editFormData.confirmedMethod, '', ['Phone Call', 'WhatsApp', 'Email', 'Office Visit'], handleInputChange, selectCls, false)}
                                                            </div>
                                                            {renderDatePicker('confirmedDate', editFormData.confirmedDate, 'Confirmed Date', handleInputChange, '', false)}
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Operations Executive</label>
                                                                {renderDropdown('operationExecutive', editFormData.operationExecutive, 'Select Exec', operationsStaff, handleInputChange, selectCls, false)}
                                                            </div>

                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Destination Type</label>
                                                                {renderDropdown('confirmedTripType', editFormData.confirmedTripType, '', ['Domestic', 'International'], handleInputChange, selectCls, false)}
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Destination</label>
                                                                <input type="text" name="confirmedDestination" value={editFormData.confirmedDestination} onChange={handleInputChange} className={inputCls} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Duration</label>
                                                                {renderDropdown('confirmedDuration', editFormData.confirmedDuration, '', ['1 Day (Same Day Return)', '1N / 2D', '2N / 3D', '3N / 4D', '4N / 5D', '5N / 6D', '6N / 7D', '7N / 8D', '8N / 9D', '9N / 10D', 'Others'], handleInputChange, selectCls, false)}
                                                            </div>

                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">No. of Pax (Adults | Children)</label>
                                                                <div className="flex gap-2">
                                                                    <input type="number" name="noOfPax" placeholder="Adults" value={editFormData.noOfPax} onChange={handleInputChange} className={inputCls} min="1" />
                                                                    <input type="number" name="confirmedNoOfChildren" placeholder="Children" value={editFormData.confirmedNoOfChildren} onChange={handleInputChange} className={inputCls} min="0" />
                                                                </div>
                                                            </div>
                                                            {renderDatePicker('departureDate', editFormData.departureDate, 'Departure Date', handleInputChange, '', false)}
                                                            {renderDatePicker('returnDate', editFormData.returnDate, 'Return Date', handleInputChange, '', false)}

                                                            {renderDatePicker('tourStartDate', editFormData.tourStartDate, 'Tour Start Date', handleInputChange, '', false)}
                                                            {renderDatePicker('tourEndDate', editFormData.tourEndDate, 'Tour End Date', handleInputChange, '', false)}
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Services</label>
                                                                {renderMultiSelect('confirmedServices', editFormData.confirmedServices, ['Flight Booking', 'Hotel Booking', 'Train Booking', 'Bus Booking', 'VISA Apply', 'Travel Insurance','Tour Package'], false)}
                                                            </div>

                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">GST</label>
                                                                {renderDropdown('gst', editFormData.gst, '', ['Yes', 'NO'], handleInputChange, selectCls, false)}
                                                            </div>
                                                            {editFormData.confirmedTripType === 'International' && (
                                                                <div>
                                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">TCS</label>
                                                                    {renderDropdown('tcs', editFormData.tcs, '', ['Yes', 'No' ], handleInputChange, selectCls, false)}
                                                                </div>
                                                            )}
                                                            
                                                            {(() => {
                                                                const selectedServicesArr = editFormData.confirmedServices ? editFormData.confirmedServices.split(', ').filter(Boolean) : [];
                                                                return selectedServicesArr.map((srv, idx) => (
                                                                    <div key={idx}>
                                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">{srv} Cost</label>
                                                                        <input 
                                                                            type="text" 
                                                                            value={(editFormData.serviceCosts && editFormData.serviceCosts[srv]) || editFormData[`service${idx+1}Cost`] || ''} 
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                setEditFormData(prev => {
                                                                                    const newServiceCosts = { ...(prev.serviceCosts || {}) };
                                                                                    newServiceCosts[srv] = val;
                                                                                    return {
                                                                                        ...prev,
                                                                                        serviceCosts: newServiceCosts,
                                                                                        ...(idx < 3 ? { [`service${idx+1}Cost`]: val } : {})
                                                                                    };
                                                                                });
                                                                            }} 
                                                                            className={inputCls} 
                                                                        />
                                                                    </div>
                                                                ));
                                                            })()}
                                                            
                                                            {(!editFormData.confirmedServices || editFormData.confirmedServices.split(', ').filter(Boolean).length === 0) && (
                                                                <div>
                                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Package Cost</label>
                                                                    <input type="text" name="finalPackageValue" value={editFormData.finalPackageValue} onChange={handleInputChange} className={inputCls} />
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            <div className="pt-5 border-t border-slate-700/50">
                                                <h4 className="text-sm font-bold text-cyan-400 mb-4 tracking-wider uppercase">Passenger Details</h4>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl mb-4">
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">
                                                            {editFormData.confirmedTripType === 'International' ? 'Full Name As Per Passport' : 'Full Name As Per Aadhar'}
                                                        </label>
                                                        <input type="text" name="fullName" value={currentPassenger.fullName} onChange={handleCurrentPassengerChange} className={inputCls} />
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Date of Birth</label>
                                                        <input type="date" name="dob" value={currentPassenger.dob} onChange={handleCurrentPassengerChange} className={`${inputCls} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Gender</label>
                                                        <select name="gender" value={currentPassenger.gender} onChange={handleCurrentPassengerChange} className={selectCls}>
                                                            <option value="" disabled hidden></option>
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Aadhar Card Number</label>
                                                        <input type="text" name="aadharNumber" value={currentPassenger.aadharNumber} onChange={handleCurrentPassengerChange} maxLength={12} inputMode="numeric" className={inputCls} />
                                                    </div>

                                                    {editFormData.confirmedTripType === 'International' && (
                                                        <>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">PAN Card Number</label>
                                                                <input type="text" name="panNumber" value={currentPassenger.panNumber} onChange={handleCurrentPassengerChange} className={inputCls} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Passport Number</label>
                                                                <input type="text" name="passportNumber" value={currentPassenger.passportNumber} onChange={handleCurrentPassengerChange} className={inputCls} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Passport Place of Issue</label>
                                                                <input type="text" name="passportIssuePlace" value={currentPassenger.passportIssuePlace} onChange={handleCurrentPassengerChange} className={inputCls} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Passport Issue Date</label>
                                                                <input type="date" name="passportIssueDate" value={currentPassenger.passportIssueDate} onChange={handleCurrentPassengerChange} className={`${inputCls} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Passport Expiry Date</label>
                                                                <input type="date" name="passportExpiryDate" value={currentPassenger.passportExpiryDate} onChange={handleCurrentPassengerChange} className={`${inputCls} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer`} />
                                                            </div>
                                                        </>
                                                    )}
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Mobile Number</label>
                                                        <input type="text" name="mobileNumber" value={currentPassenger.mobileNumber} onChange={handleCurrentPassengerChange} className={inputCls} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Emergency Contact Number</label>
                                                        <input type="text" name="emergencyContact" value={currentPassenger.emergencyContact} onChange={handleCurrentPassengerChange} className={inputCls} />
                                                    </div>
                                                    
                                                    <div className="md:col-span-3 flex justify-start mt-2">
                                                        <button type="button" onClick={handleAddPassenger} className="text-cyan-400 font-bold text-sm flex items-center gap-1 hover:text-cyan-300 bg-transparent border-none cursor-pointer">
                                                            <Plus size={16} /> Add Another Passenger
                                                        </button>
                                                    </div>
                                                </div>

                                                {editFormData.passengers && editFormData.passengers.length > 0 && (
                                                    <div className="overflow-x-auto custom-scrollbar border border-slate-700/50 rounded-lg">
                                                        <table className="w-full text-left text-[11px] sm:text-xs text-slate-300 whitespace-nowrap">
                                                            <thead className="bg-slate-800/80 border-b border-slate-700/50">
                                                                <tr>
                                                                    <th className="p-2.5 font-medium">Name</th>
                                                                    <th className="p-2.5 font-medium">DOB</th>
                                                                    <th className="p-2.5 font-medium">Gender</th>
                                                                    <th className="p-2.5 font-medium">Aadhar</th>
                                                                    {editFormData.confirmedTripType === 'International' && (
                                                                        <>
                                                                            <th className="p-2.5 font-medium">PAN</th>
                                                                            <th className="p-2.5 font-medium">Passport</th>
                                                                            <th className="p-2.5 font-medium">Issue Place</th>
                                                                            <th className="p-2.5 font-medium">Issue Date</th>
                                                                            <th className="p-2.5 font-medium">Expiry</th>
                                                                        </>
                                                                    )}
                                                                    <th className="p-2.5 font-medium">Mobile</th>
                                                                    <th className="p-2.5 font-medium text-center">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {editFormData.passengers.map((p, idx) => (
                                                                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/40">
                                                                        <td className="p-2.5">{p.fullName}</td>
                                                                        <td className="p-2.5">{p.dob}</td>
                                                                        <td className="p-2.5">{p.gender}</td>
                                                                        <td className="p-2.5">{p.aadharNumber}</td>
                                                                        {editFormData.confirmedTripType === 'International' && (
                                                                            <>
                                                                                <td className="p-2.5">{p.panNumber}</td>
                                                                                <td className="p-2.5">{p.passportNumber}</td>
                                                                                <td className="p-2.5">{p.passportIssuePlace}</td>
                                                                                <td className="p-2.5">{p.passportIssueDate}</td>
                                                                                <td className="p-2.5">{p.passportExpiryDate}</td>
                                                                            </>
                                                                        )}
                                                                        <td className="p-2.5">{p.mobileNumber}</td>
                                                                        <td className="p-2.5 text-center">
                                                                            <button type="button" onClick={() => handleRemovePassenger(idx)} className="text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer">
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-5 border-t border-slate-700/50">
                                                <h4 className="text-sm font-bold text-cyan-400 mb-4 tracking-wider uppercase">Document Collection</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Aadhar Copy</label>
                                                        <select name="aadharCopy" value={editFormData.aadharCopy} onChange={handleInputChange} className={selectCls}>
                                                            <option value="" disabled hidden></option>
                                                            <option value="Pending">Pending</option>
                                                            <option value="Received">Received</option>
                                                        </select>
                                                    </div>
                                                    {editFormData.confirmedTripType === 'International' && (
                                                        <div>
                                                            <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Passport Copy</label>
                                                            <select name="passportCopy" value={editFormData.passportCopy} onChange={handleInputChange} className={selectCls}>
                                                                <option value="" disabled hidden></option>
                                                                <option value="Pending">Pending</option>
                                                                <option value="Received">Received</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Photograph</label>
                                                        <select name="photograph" value={editFormData.photograph} onChange={handleInputChange} className={selectCls}>
                                                            <option value="" disabled hidden></option>
                                                            <option value="Pending">Pending</option>
                                                            <option value="Received">Received</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Remarks</label>
                                                        <input type="text" name="docRemarks" value={editFormData.docRemarks} onChange={handleInputChange} className={inputCls} />
                                                    </div>
                                                    
                                                    <div className="md:col-span-3">
                                                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Upload Direct Files</label>
                                                        <div className="relative flex items-center justify-center bg-slate-900 border border-slate-700 border-dashed rounded-lg sm:rounded px-3 py-4 cursor-pointer hover:border-cyan-500 transition-colors">
                                                            <span className="text-cyan-400 text-sm font-medium flex items-center gap-2">
                                                                <Plus size={16} /> Select Files to Upload
                                                            </span>
                                                            <input type="file" multiple onChange={handleDirectFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                        </div>
                                                        {editFormData.attachedFiles?.length > 0 && (
                                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {editFormData.attachedFiles.map((file, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50">
                                                                        <span className="text-xs text-slate-300 truncate max-w-[80%]" title={file.name}>{file.name}</span>
                                                                        <div className="flex gap-1.5 flex-shrink-0">
                                                                            <button type="button" onClick={() => window.open(file.base64 || file.url, '_blank')} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-blue-400 hover:bg-slate-700" title="View File"><Eye size={14}/></button>
                                                                            <button type="button" onClick={() => removeAttachedFile(idx)} className="p-1 rounded bg-slate-800 border-none cursor-pointer text-red-400 hover:bg-red-950" title="Delete"><Trash2 size={14}/></button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            )}

                            {(activeTab === 'My Confirmation' || expandedSections.paymentInfo) && (
                                <div id="section-paymentInfo" className={sectionCls}>
                                    <div className="flex justify-between items-center cursor-pointer pb-1 sm:pb-2 border-b border-slate-800/60" onClick={() => toggleSection('paymentInfo')}>
                                        <h3 className={`text-sm sm:text-base font-bold tracking-wider uppercase m-0 flex items-center gap-2 text-emerald-400`}>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                            Payment Information
                                        </h3>
                                        {expandedSections.paymentInfo ? <ChevronDown size={18} className="text-emerald-400" /> : <ChevronRight size={18} className="text-slate-500"/>}
                                    </div>
                                    
                                    {expandedSections.paymentInfo && (
                                        <div className="mt-4">
                                            <div className="mb-6 p-4 bg-[#091124] border border-slate-700/60 rounded-xl">
                                                <h4 className="text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Payment History</h4>
                                                
                                                <div className="overflow-x-auto custom-scrollbar">
                                                    <table className="w-full text-left text-xs sm:text-sm text-slate-300 whitespace-nowrap">
                                                        <thead className="text-slate-500 font-semibold border-b border-slate-800">
                                                            <tr>
                                                                <th className="pb-2 font-medium">Date</th>
                                                                <th className="pb-2 font-medium">Payment Stage</th>
                                                                <th className="pb-2 font-medium">Service</th>
                                                                <th className="pb-2 font-medium">Amount</th>
                                                                <th className="pb-2 font-medium">Mode</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800">
                                                            {editFormData.paymentHistoryList && editFormData.paymentHistoryList.length > 0 ? (
                                                                editFormData.paymentHistoryList.map((payment, idx) => (
                                                                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                                                        <td className="py-2.5">{payment.date}</td>
                                                                        <td className="py-2.5">{payment.stage}</td>
                                                                        <td className="py-2.5">{payment.service}</td>
                                                                        <td className="py-2.5 text-emerald-400 font-semibold">₹{payment.amount}</td>
                                                                        <td className="py-2.5">{payment.mode}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="5" className="py-4 text-center text-slate-500 italic">No payments recorded yet.</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 border-t border-slate-700/50 pt-5">
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Service</label>
                                                    {renderDropdown('paymentService', editFormData.paymentService, '', ['Tour Package', 'Flight Booking', 'Hotel Booking', 'VISA Apply', 'Transport','Train Booking','Bus Booking','Travel Insurance'], handleInputChange)}
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Amount Collected</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                                        <input type="text" name="amountReceived" value={editFormData.amountReceived} onChange={handleInputChange} className={`${inputCls} pl-7`} placeholder="" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Payment Mode</label>
                                                    {renderDropdown('paymentMode', editFormData.paymentMode, '', ['UPI / QR', 'Net Banking', 'Credit Card', 'Cash'], handleInputChange)}
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Transaction Reference</label>
                                                    <input type="text" name="transactionId" value={editFormData.transactionId} onChange={handleInputChange} className={inputCls} />
                                                </div>
                                                {renderDatePicker('customerPaymentDate', editFormData.customerPaymentDate, 'Customer Payment Date', handleInputChange, '')}
                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Payment Stage</label>
                                                    {renderDropdown('paymentStatus', editFormData.paymentStatus, '', ['First Payment', 'Pending Initial Deposit', 'Partially Paid Tokens', 'Fully Settled Clearance', 'Payment Overdue'], handleInputChange)}
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] sm:text-xs font-medium text-slate-300 mb-1">Attachment</label>
                                                    <div className="relative flex items-center justify-center bg-slate-900 border border-slate-700 rounded-lg sm:rounded px-3 py-2 sm:py-1.5 cursor-pointer hover:border-cyan-500 transition-colors">
                                                        <span className="text-cyan-400 text-sm font-medium flex items-center gap-2">
                                                            <FileText size={16} />
                                                            Attach File
                                                        </span>
                                                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                    </div>
                                                </div>
                                                {renderDatePicker('nextPaymentDate', editFormData.nextPaymentDate, 'Next Payment Date', handleInputChange, '')}
                                                
                                                <div className="flex items-end h-full">
                                                    <button type="button" onClick={handleAddPaymentHistory} className="w-full h-[38px] sm:h-[34px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 border-none cursor-pointer">
                                                        <Plus size={16} /> Save Payment Record
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="px-4 sm:px-6 py-4 border-t border-slate-800 bg-[#0b1329] z-20 flex justify-end gap-3 flex-shrink-0">
                        <button type="button" onClick={() => setIsEditModalOpen(false)}
                            className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-transparent border border-cyan-500 hover:bg-slate-800 cursor-pointer text-cyan-400 text-sm sm:text-base font-semibold rounded-lg sm:rounded transition-colors uppercase tracking-wider order-2 sm:order-1">
                            CANCEL
                        </button>
                        <button type="submit" form="edit-lead-form" className="w-full sm:w-auto px-10 py-3 sm:py-2.5 bg-[#16D3F2] hover:bg-cyan-400 active:bg-cyan-600 border-none cursor-pointer text-[#0f172a] text-sm sm:text-base font-bold rounded-lg sm:rounded shadow transition-colors uppercase tracking-wider order-1 sm:order-2">
                            SUBMIT
                        </button>
                    </div>
                </div>
            )}

            {isAssignModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-5 sm:pt-6 pb-2 flex-shrink-0">
                            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="absolute top-4 right-4 text-slate-400 border-none bg-transparent cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 tracking-tight pr-6 truncate">Assign Operation</h2>
                        </div>
                        <div className="px-6 pb-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Job ID</label>
                                <input type="text" readOnly value={`LMN${selectedLead.id}`}
                                    className="w-full px-3 py-2.5 sm:py-2 bg-slate-900 border border-slate-700 rounded-lg sm:rounded-md text-slate-300 outline-none font-medium" />
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Self Assignment</label>
                                <button type="button" onClick={() => setAssignTo('Self Assigned')}
                                    className={`w-full py-3 sm:py-2.5 rounded-lg sm:rounded-md font-semibold cursor-pointer text-center border transition-all ${assignTo === 'Self Assigned' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800/60'}`}>
                                    {assignTo === 'Self Assigned' ? '✓ Claimed by Me' : 'Assign to Myself'}
                                </button>
                            </div>
                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Assigned To (Sales Team)</label>
                                {renderDropdown('assignTo', assignTo !== 'Self Assigned' ? assignTo : '', '-- Select Sales Employee --', [...salesStaff],
                                    (e) => setAssignTo(e.target.value),
                                    `w-full px-3 py-3 sm:py-2.5 border rounded-lg sm:rounded-md bg-slate-900 text-white focus:outline-none transition-colors ${assignTo && assignTo !== 'Self Assigned' ? 'border-orange-500 focus:border-orange-500' : 'border-slate-700 focus:border-orange-500'}`
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-2">
                                <button type="button" onClick={handleAssignSubmit} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-orange-500 border-none cursor-pointer hover:bg-orange-600 text-white font-bold rounded-lg sm:rounded shadow transition-colors order-1 sm:order-2">Submit</button>
                                <button type="button" onClick={() => setIsAssignModalOpen(false)} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-transparent cursor-pointer border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg sm:rounded transition-colors order-2 sm:order-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isHandoverModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-slate-700/60 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-5 sm:pt-6 pb-2 flex-shrink-0">
                            <button type="button" onClick={() => setIsHandoverModalOpen(false)} className="absolute top-4 right-4 text-slate-400 border-none bg-transparent cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 tracking-tight pr-6 truncate">Handover to Operation</h2>
                        </div>
                        <div className="px-6 pb-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
                            
                            {!handoverLead ? (
                                <div>
                                    <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Select Job ID</label>
                                    <select 
                                        value={handoverLeadId} 
                                        onChange={(e) => setHandoverLeadId(e.target.value)}
                                        className="w-full px-3 py-3 sm:py-2.5 border border-slate-700 rounded-lg sm:rounded-md bg-slate-900 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                    >
                                        <option value="" disabled>-- Select a Job from current tab --</option>
                                        {filteredData.map(job => (
                                            <option key={job.id} value={job.id}>LMN{job.id} - {job.customerName || 'Unknown'}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Job ID</label>
                                    <input type="text" readOnly value={`LMN${handoverLead.id}`}
                                        className="w-full px-3 py-2.5 sm:py-2 bg-slate-900 border border-slate-700 rounded-lg sm:rounded-md text-slate-300 outline-none font-medium cursor-not-allowed" />
                                </div>
                            )}
                            
                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Share To</label>
                                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                                    <button type="button" onClick={() => setHandoverOption('pool')}
                                        className={`p-3 sm:p-4 rounded-lg border text-left cursor-pointer flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition-all ${handoverOption === 'pool' ? 'bg-[#07202a] border-cyan-500 text-white ring-1 ring-cyan-500' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                                        <ShoppingCart size={20} className={handoverOption === 'pool' ? 'text-cyan-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                                        <div>
                                            <p className="font-bold text-sm">Common Ops Jobs</p>
                                            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Any Ops exec can pick it up</p>
                                        </div>
                                    </button>
                                    <button type="button" onClick={() => setHandoverOption('employee')}
                                        className={`p-3 sm:p-4 rounded-lg border text-left cursor-pointer flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition-all ${handoverOption === 'employee' ? 'bg-[#07202a] border-orange-500 text-white ring-1 ring-orange-500' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                                        <Users size={20} className={handoverOption === 'employee' ? 'text-orange-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                                        <div>
                                            <p className="font-bold text-sm">Individual Ops Exec</p>
                                            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Assign directly to one person</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {handoverOption === 'employee' ? (
                                <div>
                                    <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Assigned To (Operations Team)</label>
                                    <select 
                                        value={handoverTarget} 
                                        onChange={(e) => setHandoverTarget(e.target.value)}
                                        className="w-full px-3 py-3 sm:py-2.5 border border-slate-700 rounded-lg sm:rounded-md bg-slate-900 text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                                    >
                                        <option value="" disabled hidden>-- Select Ops Employee --</option>
                                        {operationsStaff.map((emp, idx) => (
                                            <option key={idx} value={emp}>{emp}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="px-3 py-3 rounded-lg bg-cyan-950/20 border border-cyan-900/30 text-xs sm:text-sm text-cyan-300/90 leading-relaxed text-center sm:text-left">
                                    This job will drop into Operations' shared <strong>"Jobs"</strong> queue, unassigned, for any Ops executive to claim.
                                </div>
                            )}

                            <div>
                                <label className="block font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px] sm:text-xs">Handover Notes</label>
                                <textarea 
                                    value={handoverNotes} 
                                    onChange={(e) => setHandoverNotes(e.target.value)}
                                    rows="3"
                                    placeholder="Add required operational notes here..."
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg sm:rounded-md text-slate-300 outline-none focus:border-purple-500 transition-colors resize-none custom-scrollbar" 
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-2">
                                <button type="button" onClick={() => setIsHandoverModalOpen(false)} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-transparent cursor-pointer border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg sm:rounded transition-colors order-2 sm:order-1">Cancel</button>
                                <button type="button" onClick={handleHandoverSubmit} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-purple-500 border-none cursor-pointer hover:bg-purple-600 text-white font-bold rounded-lg sm:rounded shadow transition-colors order-1 sm:order-2">Submit</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isReassignModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] border border-slate-700/90 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-5 sm:pt-6 pb-2 flex-shrink-0">
                            <button type="button" onClick={() => setIsReassignModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 pr-6 truncate">
                                <RefreshCw size={20} className="text-orange-400 flex-shrink-0" /> <span className="truncate">Reassign Pipeline Action</span>
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 mb-4 truncate">Configure allocation for Job ID: LMN{selectedLead.id}</p>
                        </div>
                        <div className="px-6 pb-6 space-y-4 text-sm overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
                                <button type="button" onClick={() => setReassignOption('pool')}
                                    className={`p-3 sm:p-4 rounded-lg border text-left cursor-pointer flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition-all ${reassignOption === 'pool' ? 'bg-[#07202a] border-cyan-500 text-white ring-1 ring-cyan-500' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                                    <ShoppingCart size={20} className={reassignOption === 'pool' ? 'text-cyan-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                                    <div>
                                        <p className="font-bold text-sm">Back to Jobs Pool</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Release to public pool</p>
                                    </div>
                                </button>
                                <button type="button" onClick={() => setReassignOption('employee')}
                                    className={`p-3 sm:p-4 rounded-lg border text-left cursor-pointer flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-2 transition-all ${reassignOption === 'employee' ? 'bg-[#07202a] border-orange-500 text-white ring-1 ring-orange-500' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}>
                                    <Users size={20} className={reassignOption === 'employee' ? 'text-orange-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                                    <div>
                                        <p className="font-bold text-sm">To Sales Employee</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Transfer ownership</p>
                                    </div>
                                </button>
                            </div>
                            {reassignOption === 'employee' ? (
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Sales Employee</label>
                                        {renderDropdown('reassignTargetEmployee', reassignTargetEmployee, '-- Choose Sales Employee --', [...salesStaff],
                                            (e) => setReassignTargetEmployee(e.target.value),
                                            "w-full px-3 py-2.5 sm:py-2 bg-slate-900 text-white border border-slate-700 rounded-lg sm:rounded-md focus:outline-none focus:border-orange-500 transition-all"
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason for Reassignment</label>
                                        <textarea value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} rows="3"
                                            placeholder="Specify context or reason for transferring this lead..."
                                            className="w-full px-3 py-2 bg-slate-900 text-white border border-slate-700 rounded-lg sm:rounded-md focus:outline-none focus:border-orange-500 transition-all placeholder-slate-500 resize-none custom-scrollbar" />
                                    </div>
                                </div>
                            ) : (
                                <div className="px-3 py-3 rounded-lg bg-cyan-950/20 border border-cyan-900/30 text-xs sm:text-sm text-cyan-300/90 leading-relaxed text-center sm:text-left">
                                    This will reset the assignment and move the lead back to the unassigned global <strong>"Jobs"</strong> pool.
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 mt-4 sm:mt-0">
                                <button type="button" onClick={handleReassignSubmit} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-orange-500 border-none cursor-pointer hover:bg-orange-600 text-white font-bold rounded-lg sm:rounded shadow transition-colors order-1 sm:order-2">Confirm Reassign</button>
                                <button type="button" onClick={() => setIsReassignModalOpen(false)} className="w-full sm:flex-1 py-2.5 sm:py-2 bg-transparent cursor-pointer border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium rounded-lg sm:rounded transition-colors order-2 sm:order-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isViewModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-6 pb-3 sm:pb-2 border-b border-slate-700/50 flex-shrink-0">
                            <button type="button" onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-slate-400 bg-transparent border-none cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-4 pr-6 truncate">Lead Details (LMN{selectedLead.id})</h2>
                        </div>
                        <div className="px-6 py-5 overflow-y-auto space-y-4 text-slate-300 text-sm sm:text-base flex-1 custom-scrollbar">
                            {[
                                { label: 'Customer', value: selectedLead.customerName || selectedLead.profileName || 'N/A', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Destination', value: selectedLead.destination || 'N/A', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Travel Dates', value: selectedLead.travelDates || selectedLead.dates || 'TBD', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Budget', value: selectedLead.budget || selectedLead.amount || 'N/A', cls: 'font-semibold text-emerald-400 text-right sm:text-left' },
                                { label: 'Phone', value: selectedLead.phone || 'N/A', cls: 'font-medium text-white text-right sm:text-left' },
                                { label: 'Platform', value: selectedLead.platform || 'Website', cls: 'font-medium text-blue-300 text-right sm:text-left' },
                            ].map(f => (
                                <div key={f.label} className="flex flex-row justify-between items-center sm:items-start border-b border-slate-700/50 pb-3 sm:pb-2 gap-2">
                                    <span className="text-slate-400 text-xs sm:text-sm whitespace-nowrap">{f.label}:</span>
                                    <span className={f.cls}>{f.value}</span>
                                </div>
                            ))}
                            <div className="mt-5 bg-[#07202a] px-4 py-4 rounded-lg border border-slate-700/30 space-y-3">
                                <div>
                                    <span className="block text-xs sm:text-sm text-slate-400 mb-1">Message from Lead:</span>
                                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                                        {selectedLead.leadMessage || selectedLead.message || 'No message provided.'}
                                    </p>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isHistoryModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-2xl relative flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-6 pb-3 sm:pb-2 border-b border-slate-700/50 flex-shrink-0 flex justify-between items-center">
                            <h2 className="text-lg sm:text-xl font-bold text-white pr-6 truncate flex items-center gap-2">
                                <History size={20} className="text-purple-400" />
                                Lead History - LMN{selectedLead.id} | {selectedLead.customerName || 'N/A'}
                            </h2>
                            <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 bg-transparent border-none cursor-pointer hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 py-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                            {(() => {
                                const timeline = buildLeadTimeline(selectedLead);
                                const rawHistory = safeParseHistory(selectedLead.history); 
                                const createdEntry = rawHistory.find(h => /^Lead Created$/i.test(h.action || ''));
                                const leadCreated = fmtHistoryDate(selectedLead.createdAt) || createdEntry?.date || null;
                                const leadUpdated = fmtHistoryDate(selectedLead.updatedAt) || rawHistory[0]?.date || null;
                                return (
                                    <>
                                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Current Stage</span>
                                                <span className="px-2.5 py-1 rounded-lg text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {selectedLead.finalStatus || selectedLead.status || 'Jobs'}
                                                </span>
                                                {selectedLead.assignedTo && selectedLead.assignedTo !== 'Unassigned' && (
                                                    <span className="text-xs text-slate-400">Handled By: <span className="text-slate-200 font-semibold">{selectedLead.assignedTo}</span></span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-slate-100">{selectedLead.leadResponse || selectedLead.status || 'N/A'}</p>
                                            <div className="text-xs text-slate-400 space-y-0.5">
                                                <p>Lead Created: <span className="text-slate-300">{leadCreated || 'N/A'}</span></p>
                                                <p>Lead Updated: <span className="text-slate-300">{leadUpdated || 'N/A'}</span></p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-slate-300 mb-1 flex items-center gap-2">
                                                <History size={16} className="text-cyan-400" /> Lead Journey
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
                                                                <span className={`absolute -left-[7px] top-1 w-3 h-3 rotate-45 ring-4 ring-[#0f172a] ${isCurrent ? 'bg-blue-500' : (log._explicit ? 'bg-purple-500' : 'bg-slate-500')}`} />
                                                                {isCurrent ? (
                                                                    <div className="border border-blue-500/60 bg-blue-500/5 rounded-lg px-3 py-2 -mt-1">
                                                                        {body}
                                                                    </div>
                                                                ) : body}
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="pl-6 relative -mt-3">
                                                        <span className="absolute -left-[4px] top-0 w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2 border-t border-slate-700/50 pt-5">
                                                <ClipboardList size={16} className="text-slate-400" /> Complete Record by Stage
                                            </h4>
                                            <div className="space-y-2">
                                                {STAGE_CONFIG.filter(s => s.key !== 'lead').map(stage => {
                                                    const fields = STAGE_FIELD_MAPS[stage.key] || [];
                                                    const populated = fields.filter(([f]) => {
                                                        const v = selectedLead[f];
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
                                                                            <p className="text-sm text-slate-200 break-words">{String(selectedLead[field])}</p>
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
                                            <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors">
                                                Close Window
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
    
            <button type="button" onClick={scrollToTop}
                className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-6 p-2.5 sm:p-3 rounded-full text-white bg-slate-700/80 border-none cursor-pointer hover:bg-slate-600 backdrop-blur-sm shadow-xl transition-all duration-300 z-40 ${showScrollButton ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-8 invisible'}`}
                aria-label="Scroll to top">
                <ArrowUp size={20} className="sm:w-[24px] sm:h-[24px]" />
            </button>

        </div>
    );
};

export default SalesDashboard;