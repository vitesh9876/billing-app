"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  History, 
  MessageSquare, 
  Settings, 
  Send, 
  Search, 
  CheckCircle, 
  X,
  Phone,
  MapPin,
  Printer,
  ChevronRight,
  Grid,
  Table,
  List,
  Bell,
  Plus,
  Upload,
  Trash2,
  BookOpen
} from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [itemsCatalog, setItemsCatalog] = useState<any[]>([]);
  const [activeItemSuggestions, setActiveItemSuggestions] = useState<{[key: string]: any[]}>({});
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemForm, setItemForm] = useState({ id: "", name: "", category: "Jewelry" });
  const [customerViewMode, setCustomerViewMode] = useState<"grid" | "table" | "compact">("grid");
  const [remindersStatus, setRemindersStatus] = useState<any[]>([]);
  const [showConnectionGuide, setShowConnectionGuide] = useState(false);
  const [readmeSubTab, setReadmeSubTab] = useState("Overview");
  const isDeleteKey = useRef(false);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      isDeleteKey.current = e.key === "Backspace" || e.key === "Delete";
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);
  
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("smartshop-theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const handleToggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("smartshop-theme", newTheme);
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this customer and all their profiles? This action cannot be undone.")) {
      return;
    }
    fetch(`/api/v1/customers/${customerId}`, {
      method: "DELETE"
    })
    .then(res => {
      if (res.ok) {
        if (selectedProfileCustomer && selectedProfileCustomer.id === customerId) {
          setSelectedProfileCustomer(null);
        }
        refreshData();
      } else {
        alert("Failed to delete customer");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error deleting customer");
    });
  };
  
  const safeItems = Array.isArray(itemsCatalog) ? itemsCatalog : [];
  
  // Dashboard states
  const [stats, setStats] = useState({
    totalSales: 0,
    activeLoans: 0,
    pledgedValue: 0,
    totalCustomers: 0
  });

  // SMS status
  const [smsDevices, setSmsDevices] = useState<any[]>([]);
  const [smsQueue, setSmsQueue] = useState<any[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<any[]>([]);
  
  // Real-time WebSocket connection status
  const [wsConnected, setWsConnected] = useState(false);

  // Billing Tab States
  const [billingType, setBillingType] = useState<"purchase" | "loan">("purchase");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [billingCustName, setBillingCustName] = useState("");
  const [billingCustPhone, setBillingCustPhone] = useState("");
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<any[]>([]);
  const [sendThankYouSms, setSendThankYouSms] = useState(true);
  
  // Purchase items
  const [purchaseCategory, setPurchaseCategory] = useState<"Jewelry" | "Furniture">("Jewelry");
  const [purchaseItems, setPurchaseItems] = useState<any[]>([
    { id: 1, particulars: "", grams: "", mg: "", qty: 1, amount: "" }
  ]);

  // Loan Finance Items
  const [loanMetalType, setLoanMetalType] = useState<"Gold" | "Silver">("Gold");
  const [loanPledgedItems, setLoanPledgedItems] = useState<any[]>([
    { id: 1, name: "", qty: 1, yield: "", grossWeight: "", netWeight: "", value: "", remarks: "" }
  ]);
  const [loanDetails, setLoanDetails] = useState({
    father: "",
    idProof: "",
    address: "",
    mandal: "",
    amount: "",
    interestRate: "1.5%",
    takenDate: new Date().toISOString().split('T')[0],
    endDate: ""
  });

  // Send SMS States
  const [smsCustomerName, setSmsCustomerName] = useState("");
  const [smsCustomerPhone, setSmsCustomerPhone] = useState("");
  const [smsCustSuggestions, setSmsCustSuggestions] = useState<any[]>([]);
  const [selectedSmsCustomer, setSelectedSmsCustomer] = useState<any>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [smsMessageText, setSmsMessageText] = useState("");
  const [smsSubTab, setSmsSubTab] = useState<"send" | "queue" | "templates">("send");
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editTemplateContent, setEditTemplateContent] = useState("");
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);

  // Customer List Search & Modals
  const [searchCustomerQuery, setSearchCustomerQuery] = useState("");
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    id: "",
    name: "",
    phone: "",
    address: "",
    father: "",
    idproof: "",
    mandal: ""
  });

  // Loan history Search & Filters
  const [loanHistorySearch, setLoanHistorySearch] = useState("");
  const [loanHistoryFilter, setLoanHistoryFilter] = useState("all");
  const [loanSortField, setLoanSortField] = useState<"date" | "name" | "amount">("date");
  const [loanSortOrder, setLoanSortOrder] = useState<"asc" | "desc">("desc");

  // Custom Offline Loan States
  const [showOfflineLoanModal, setShowOfflineLoanModal] = useState(false);
  const [offlineLoanMetalType, setOfflineLoanMetalType] = useState("Gold");
  const [offlineLoanPledgedItems, setOfflineLoanPledgedItems] = useState<any[]>([
    { id: 1, name: "", qty: 1, yield: "", grossWeight: "", netWeight: "", remarks: "" }
  ]);
  interface OfflineLoanFormState {
    billNo: string;
    custName: string;
    phone: string;
    father: string;
    idProof: string;
    address: string;
    mandal: string;
    amount: string;
    interestRate: string;
    takenDate: string;
    endDate: string;
    status: string;
    interestPaidUpto: string;
    clearedDate: string;
    pledgedItemsStr: string;
    qty: string;
    yield: string;
    grossWeight: string;
    netWeight: string;
    worth: string;
    remarks: string;
    interestAmountPaid: string;
    note: string;
    topups: any[];
    newTopUpAmount: string;
    newTopUpDate: string;
    newTopUpRemarks: string;
    newRepaymentAmount: string;
    newRepaymentDate: string;
    newRepaymentRemarks: string;
    starSeries: boolean;
  }

  const [offlineLoanForm, setOfflineLoanForm] = useState<OfflineLoanFormState>({
    billNo: "",
    custName: "",
    phone: "",
    father: "",
    idProof: "",
    address: "",
    mandal: "",
    amount: "",
    interestRate: "3.0%",
    takenDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
    status: "Pending",
    interestPaidUpto: "",
    clearedDate: "",
    pledgedItemsStr: "",
    qty: "1",
    yield: "60%",
    grossWeight: "",
    netWeight: "",
    worth: "",
    remarks: "",
    interestAmountPaid: "",
    note: "",
    topups: [],
    newTopUpAmount: "",
    newTopUpDate: new Date().toISOString().split('T')[0],
    newTopUpRemarks: "",
    newRepaymentAmount: "",
    newRepaymentDate: new Date().toISOString().split('T')[0],
    newRepaymentRemarks: "",
    starSeries: false
  });

  // Autocomplete UI states
  const [showCustSuggestions, setShowCustSuggestions] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [showMandalSuggestions, setShowMandalSuggestions] = useState(false);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(-1);
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);

  // Bulk Import States
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkImportProgress, setBulkImportProgress] = useState<{current: number, total: number, status: string} | null>(null);
  const [selectedLoanTxn, setSelectedLoanTxn] = useState<any>(null);
  const [interestPaidUptoDate, setInterestPaidUptoDate] = useState(new Date().toISOString().split('T')[0]);
  const [interestRemarks, setInterestRemarks] = useState("");
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpDate, setTopUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [topUpRemarks, setTopUpRemarks] = useState("");
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [repaymentRemarks, setRepaymentRemarks] = useState("");
  const [bulkReminderMessage, setBulkReminderMessage] = useState(
    "ప్రియమైన {CustomerName}, మీ తాకట్టు గడువు పూర్తి అయ్యింది (లోన్ నెం: {LoanId}). దయచేసి విడుదల చేసుకోండి లేదా వడ్డీ కట్టుకోగలరు. ధన్యవాదములు."
  );
  const [selectedBulkReminderTxnIds, setSelectedBulkReminderTxnIds] = useState<string[]>([]);

  // SMS queue filter
  const [smsQueueSearch, setSmsQueueSearch] = useState("");
  const [smsQueueFilter, setSmsQueueFilter] = useState("all");

  // Printing state
  const [activePrintTicket, setActivePrintTicket] = useState<any>(null);

  // Establish persistent WebSocket to server for real-time state sync
  useEffect(() => {
    let socket: WebSocket;
    const connectWS = () => {
      let backendUrl = process.env.NEXT_PUBLIC_API_URL || "";
      let wsUrl = "";
      
      if (backendUrl) {
        // Clean trailing slash
        backendUrl = backendUrl.replace(/\/$/, "");
        const wsProtocol = backendUrl.startsWith("https:") ? "wss:" : "ws:";
        const wsHost = backendUrl.replace(/^https?:\/\//, "");
        wsUrl = `${wsProtocol}//${wsHost}/ws/v1/browser`;
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.hostname}:8000/ws/v1/browser`;
      }
      
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "update") {
          refreshData();
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();
    refreshData();

    return () => {
      if (socket) socket.close();
    };
  }, []);

  const refreshData = () => {
    fetch("/api/v1/dashboard-data")
      .then(res => res.json())
      .then(data => {
        if (data.customers) setCustomers(data.customers);
        if (data.transactions) setTransactions(data.transactions);
        if (data.smsTemplates) setSmsTemplates(data.smsTemplates);
        if (data.smsQueue) setSmsQueue(data.smsQueue);
        if (data.smsDevices) setSmsDevices(data.smsDevices);
        if (Array.isArray(data.itemsCatalog)) setItemsCatalog(data.itemsCatalog);
        if (Array.isArray(data.remindersStatus)) setRemindersStatus(data.remindersStatus);
      })
      .catch(err => console.error("Error loading dashboard data:", err));
  };

  // Clear suggestions when navigating tabs
  useEffect(() => {
    setActiveItemSuggestions({});
  }, [activeTab]);

  // Clear suggestions when clicking outside
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveItemSuggestions({});
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Synchronize browser history with activeTab state for back button navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        setActiveTab("dashboard");
      }
    };
    window.history.replaceState({ tab: activeTab }, "", "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (window.history.state?.tab !== activeTab) {
      window.history.pushState({ tab: activeTab }, "", "");
    }
  }, [activeTab]);

  // Re-calculate dashboard statistics whenever transactions or customers change
  useEffect(() => {
    const totalSales = transactions
      .filter(t => t.type === "purchase")
      .reduce((sum, t) => sum + t.amount, 0);

    const activeLoansList = transactions.filter(t => t.type === "loan" && t.status !== "Cleared");
    const activeLoans = activeLoansList.length;
    const pledgedValue = activeLoansList.reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalSales,
      activeLoans,
      pledgedValue,
      totalCustomers: customers.length
    });
  }, [transactions, customers]);

  const formatBillNoForDisplay = (id: string) => {
    if (!id) return "";
    let cleaned = id.replace("BILL-", "").replace("TXN-OFFLINE-", "");
    // Remove the -YYYY suffix at the end (e.g. -2026)
    cleaned = cleaned.replace(/-\d{4}$/, "");
    // If it starts with ★ or *, show it nicely
    if (cleaned.startsWith("★") || cleaned.startsWith("*")) {
      return "★" + cleaned.replace(/^[★*]/, "");
    }
    return cleaned;
  };

  // Auto-generate next bill number for star or normal series for the given year
  const getNextBillNo = (isStar: boolean, yearStr?: string): string => {
    const year = yearStr || new Date().getFullYear().toString();
    // Collect all existing bill numbers from the same series and year
    const offlineLoans = transactions.filter(t => t.type === "loan" && t.id);
    let maxNum = 0;

    offlineLoans.forEach(t => {
      const raw = t.id.replace("BILL-", "").replace("TXN-OFFLINE-", "");
      const isStarBill = raw.startsWith("★") || raw.startsWith("*");
      
      // Check if this bill belongs to the target year
      const txnDate = t.loanDetails?.takenDate || t.date || "";
      const txnYear = txnDate ? new Date(txnDate).getFullYear().toString() : "";

      if (isStarBill === isStar && txnYear === year) {
        const numPart = parseInt(raw.replace(/^[★*]/, ""), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    return (isStar ? "★" : "") + (maxNum + 1);
  };

  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return "";
    const cleanDateStr = dateStr.split("T")[0].split(" ")[0];
    const parts = cleanDateStr.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        return `${parts[0]}/${parts[1]}/${parts[2]}`;
      }
    }
    return dateStr;
  };

  const calculateLoanInterest = (metal: string, amount: number, startDate: Date | string, endDate: Date | string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Normalize to date-only to avoid time-of-day differences
    const startDt = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDt = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    const diffTime = Math.max(0, endDt.getTime() - startDt.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let currentPrincipal = amount;
    let compoundingLog: any[] = [];
    
    const totalYears = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;

    const metalLower = (metal || "gold").toLowerCase();
    const isGold = metalLower === 'gold' || metalLower === 'jewelry' || metalLower === 'gold jewellery';

    const getMonthlyRate = (principalAmt: number, isFractional: boolean = false) => {
      if (isGold) {
        if (!isFractional) {
          if (principalAmt >= 10000 || (principalAmt + principalAmt * 0.03 * 12) >= 10000) {
            return 0.02;
          }
        } else {
          if (principalAmt >= 10000) {
            return 0.02;
          }
        }
        return 0.03;
      } else {
        return 0.05;
      }
    };

    // Calculate year-by-year compounding
    for (let yr = 1; yr <= totalYears; yr++) {
      const rate = getMonthlyRate(currentPrincipal, false);
      const yearlyInterest = currentPrincipal * rate * 12;
      
      compoundingLog.push({
        event: `Year ${yr} Mark`,
        basePrincipal: Math.round(currentPrincipal),
        interestEarned: Math.round(yearlyInterest),
        monthlyRatePercent: (rate * 100) + '%'
      });

      currentPrincipal += yearlyInterest;
    }

    // Calculate final fractional months for remaining days
    const monthsFraction = remainingDays / 30.416;
    const fullMonths = Math.floor(monthsFraction);
    const extraDaysFraction = remainingDays % 30.416;

    let addedMonthFraction = 0;
    if (extraDaysFraction >= 20) {
      addedMonthFraction = 1.0;
    } else if (extraDaysFraction >= 7 && extraDaysFraction <= 19) {
      addedMonthFraction = 0.5;
    }

    const totalFractionalMonths = fullMonths + addedMonthFraction;
    const finalRate = getMonthlyRate(currentPrincipal, true);
    const fractionalInterest = currentPrincipal * finalRate * totalFractionalMonths;

    if (totalFractionalMonths > 0) {
      compoundingLog.push({
        event: `Settlement Frame`,
        basePrincipal: Math.round(currentPrincipal),
        interestEarned: Math.round(fractionalInterest),
        monthlyRatePercent: (finalRate * 100) + '%',
        durationText: `${fullMonths} months, ${Math.round(extraDaysFraction)} days (rounded to ${totalFractionalMonths} months)`
      });
    }

    const totalFinalPayable = Math.round(currentPrincipal + fractionalInterest);
    const totalInterestGained = totalFinalPayable - amount;

    return {
      totalDays,
      totalInterest: totalInterestGained,
      settlementAmount: totalFinalPayable,
      log: compoundingLog
    };
  };

  const getLoanInterest = (txn: any) => {
    const startDateStr = txn.loanDetails?.interestPaidUpto || txn.loanDetails?.takenDate || txn.date;
    const endDateStr = txn.status === "Cleared" ? (txn.clearedDate || txn.loanDetails?.clearedDate || new Date().toISOString()) : new Date().toISOString();
    const res = calculateLoanInterest(txn.category || "gold", txn.amount, startDateStr, endDateStr);
    const accumulated = txn.loanDetails?.accumulatedInterest || 0;
    return res.totalInterest + accumulated;
  };

  const calculateInterestForRange = (amount: number, rate: number, startStr: string, endStr: string, category: string = "gold") => {
    if (!startStr || !endStr) return 0;
    const res = calculateLoanInterest(category, amount, startStr, endStr);
    return res.totalInterest;
  };

  const handlePayInterest = (txnId: string, paidUptoDate: string, amount: number, remarks: string) => {
    const passcode = prompt("Enter 4-digit passcode to clear interest:");
    if (passcode === null) return;
    if (passcode.trim() !== "1004") {
      alert("Incorrect passcode! Authorization Denied.");
      return;
    }

    const txn = transactions.find(t => t.id === txnId);
    if (!txn) return;
    
    const currentLoanDetails = txn.loanDetails || {};
    const previousPayments = currentLoanDetails.interestPayments || [];
    
    const newPayment = {
      date: new Date().toISOString().split('T')[0],
      amountPaid: amount,
      paidUpto: paidUptoDate,
      remarks: remarks || "Cleared interest"
    };
    
    const updatedLoanDetails = {
      ...currentLoanDetails,
      interestPaidUpto: paidUptoDate,
      accumulatedInterest: 0,
      interestPayments: [...previousPayments, newPayment]
    };
    
    const updatedTxn = {
      ...txn,
      loanDetails: updatedLoanDetails
    };
    
    fetch("/api/v1/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTxn)
    }).then(res => res.json())
      .then(() => {
        alert("Interest payment recorded successfully.");
        
        // Send Interest Paid SMS Confirmation
        const customerObj = customers.find(c => c.id === txn.customerId);
        if (customerObj) {
          const tpl = smsTemplates.find(t => t.name === "Interest Payment Confirmation");
          const formattedPaidUpto = formatDateToDDMMYYYY(paidUptoDate);
          const msg = tpl
            ? tpl.content
                .replace("{CustomerName}", customerObj.name)
                .replace("{InvoiceNumber}", formatBillNoForDisplay(txnId))
                .replace("{LoanAmount}", amount.toLocaleString('en-IN'))
                .replace("{LoanEndDate}", formattedPaidUpto)
            : `ప్రియమైన ${customerObj.name}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ నంబర్ ${formatBillNoForDisplay(txnId)} కి సంబంధించిన వడ్డీ ₹${amount.toLocaleString('en-IN')} చెల్లించబడింది. వడ్డీ ${formattedPaidUpto} వరకు క్లియర్ చేయబడింది. ధన్యవాదాలు.`;
          
          fetch("/api/v1/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: "SMS-" + Date.now(),
              customerId: customerObj.id,
              phone: customerObj.phone,
              message: msg,
              priority: 1,
              createdBy: "System"
            })
          });
        }

        setTransactions(transactions.map(t => t.id === txnId ? updatedTxn : t));
        setSelectedLoanTxn(updatedTxn);
        setInterestRemarks("");
        refreshData();
      });
  };

  const handleSaveTopUp = () => {
    const extra = Number(topUpAmount);
    if (!extra || extra <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const passcode = prompt("Enter 4-digit passcode to authorize extra money addition:");
    if (passcode === null) return;
    if (passcode.trim() !== "1004") {
      alert("Incorrect passcode! Authorization Denied.");
      return;
    }

    const txn = transactions.find(t => t.id === selectedLoanTxn.id);
    if (!txn) return;

    const originalAmt = txn.amount;
    const originalDateStr = txn.loanDetails?.interestPaidUpto || txn.loanDetails?.takenDate || txn.date;
    
    // Calculate difference in months between originalDate and topUpDate
    const d0 = new Date(originalDateStr);
    const d1 = new Date(topUpDate);
    const diffTime = Math.max(0, d1.getTime() - d0.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = diffDays / 30.416;

    let newAccumulatedInterest = txn.loanDetails?.accumulatedInterest || 0;
    let newTakenDate = txn.loanDetails?.takenDate || txn.date;
    let newInterestPaidUpto = txn.loanDetails?.interestPaidUpto || txn.date;
    let interestAccrued = 0;

    let logMessage = "";
    if (diffMonths < 1.0) {
      // Scenario A: Within 1 month
      // Interest on total amount starts calculating from the old date. No date change.
      logMessage = `Top-up of ₹${extra.toLocaleString('en-IN')} added within 1 month. Total amount is now ₹${(originalAmt + extra).toLocaleString('en-IN')}, and interest will be calculated from the original date.`;
    } else {
      // Scenario B: After 1 month
      // Interest on old amount is generated for the completed months, new cycle starts from top-up date.
      const completedMonths = Math.max(1, Math.floor(diffMonths));
      const rate = (parseFloat(txn.loanDetails?.interestRate) || 0) / 100;
      interestAccrued = Math.round(originalAmt * rate * completedMonths);

      newAccumulatedInterest += interestAccrued;
      newTakenDate = topUpDate;
      newInterestPaidUpto = topUpDate;
      logMessage = `Top-up of ₹${extra.toLocaleString('en-IN')} added. Interest of ₹${interestAccrued.toLocaleString('en-IN')} (${completedMonths} completed month(s)) accrued and locked up to ${topUpDate}.`;
    }

    const previousTopups = txn.loanDetails?.topups || [];
    const newTopupRecord = {
      date: topUpDate,
      extraAmount: extra,
      oldPrincipal: originalAmt,
      newPrincipal: originalAmt + extra,
      interestAccrued: interestAccrued,
      remarks: topUpRemarks || "Extra money taken"
    };

    const updatedLoanDetails = {
      ...txn.loanDetails,
      takenDate: newTakenDate,
      interestPaidUpto: newInterestPaidUpto,
      accumulatedInterest: newAccumulatedInterest,
      topups: [...previousTopups, newTopupRecord]
    };

    const updatedTxn = {
      ...txn,
      amount: originalAmt + extra,
      loanDetails: updatedLoanDetails
    };

    fetch("/api/v1/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTxn)
    }).then(res => res.json())
      .then((savedTxn) => {
        alert(logMessage);
        setShowTopUpForm(false);
        setTopUpAmount("");
        setTopUpRemarks("");
        setTransactions(transactions.map(t => t.id === savedTxn.id ? savedTxn : t));
        setSelectedLoanTxn(savedTxn);
        refreshData();
      });
  };

  const handleSaveRepayment = () => {
    const repay = Number(repaymentAmount);
    if (!repay || repay <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const passcode = prompt("Enter 4-digit passcode to authorize principal repayment:");
    if (passcode === null) return;
    if (passcode.trim() !== "1004") {
      alert("Incorrect passcode! Authorization Denied.");
      return;
    }

    const txn = transactions.find(t => t.id === selectedLoanTxn.id);
    if (!txn) return;

    const originalAmt = txn.amount;
    if (repay > originalAmt) {
      alert("Repayment amount cannot be greater than the current principal amount!");
      return;
    }

    const originalDateStr = txn.loanDetails?.interestPaidUpto || txn.loanDetails?.takenDate || txn.date;
    
    // Calculate difference in months between originalDate and repaymentDate
    const d0 = new Date(originalDateStr);
    const d1 = new Date(repaymentDate);
    const diffTime = Math.max(0, d1.getTime() - d0.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = diffDays / 30.416;

    let newAccumulatedInterest = txn.loanDetails?.accumulatedInterest || 0;
    let newTakenDate = txn.loanDetails?.takenDate || txn.date;
    let newInterestPaidUpto = txn.loanDetails?.interestPaidUpto || txn.date;
    let interestAccrued = 0;

    let logMessage = "";
    if (diffMonths < 1.0) {
      // Scenario A: Within 1 month
      // Interest on total amount starts calculating from the old date. No date change.
      logMessage = `Repayment of ₹${repay.toLocaleString('en-IN')} received within 1 month. Total remaining principal is now ₹${(originalAmt - repay).toLocaleString('en-IN')}, and interest will be calculated from the original date.`;
    } else {
      // Scenario B: After 1 month
      // Interest on old amount is generated for the completed months, new cycle starts from repayment date.
      const completedMonths = Math.max(1, Math.floor(diffMonths));
      const rate = (parseFloat(txn.loanDetails?.interestRate) || 0) / 100;
      interestAccrued = Math.round(originalAmt * rate * completedMonths);

      newAccumulatedInterest += interestAccrued;
      newTakenDate = repaymentDate;
      newInterestPaidUpto = repaymentDate;
      logMessage = `Repayment of ₹${repay.toLocaleString('en-IN')} received. Interest of ₹${interestAccrued.toLocaleString('en-IN')} (${completedMonths} completed month(s)) accrued and locked up to ${repaymentDate}.`;
    }

    const previousTopups = txn.loanDetails?.topups || [];
    const newTopupRecord = {
      date: repaymentDate,
      extraAmount: -repay,
      oldPrincipal: originalAmt,
      newPrincipal: originalAmt - repay,
      interestAccrued: interestAccrued,
      remarks: repaymentRemarks || "Principal Repayment",
      type: "repayment"
    };

    const updatedLoanDetails = {
      ...txn.loanDetails,
      takenDate: newTakenDate,
      interestPaidUpto: newInterestPaidUpto,
      accumulatedInterest: newAccumulatedInterest,
      topups: [...previousTopups, newTopupRecord]
    };

    const updatedTxn = {
      ...txn,
      amount: originalAmt - repay,
      loanDetails: updatedLoanDetails
    };

    fetch("/api/v1/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedTxn)
    }).then(res => res.json())
      .then((savedTxn) => {
        alert(logMessage);
        setShowRepaymentForm(false);
        setRepaymentAmount("");
        setRepaymentRemarks("");
        setTransactions(transactions.map(t => t.id === savedTxn.id ? savedTxn : t));
        setSelectedLoanTxn(savedTxn);
        refreshData();
      });
  };

  const handleSendBulkReminders = async () => {
    if (selectedBulkReminderTxnIds.length === 0) {
      alert("No loans selected for sending reminders.");
      return;
    }
    const passcode = prompt(`Enter 4-digit passcode to send ${selectedBulkReminderTxnIds.length} bulk reminders:`);
    if (passcode === null) return;
    if (passcode.trim() !== "1004") {
      alert("Incorrect passcode! Authorization Denied.");
      return;
    }

    let successCount = 0;
    for (const txnId of selectedBulkReminderTxnIds) {
      const rem = remindersStatus.find(r => r.loanId === txnId);
      if (!rem || !rem.phone || rem.phone === "-") continue;

      const formattedMsg = bulkReminderMessage
        .replace("{CustomerName}", rem.customerName)
        .replace("{LoanId}", formatBillNoForDisplay(rem.loanId));

      try {
        await fetch("/api/v1/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "SMS-BULK-" + txnId + "-" + Date.now(),
            customerId: rem.customerId,
            phone: rem.phone,
            message: formattedMsg,
            priority: 1,
            createdBy: "System"
          })
        });
        successCount++;
      } catch (err) {
        console.error("Failed to send bulk reminder for:", txnId, err);
      }
    }

    alert(`Successfully queued ${successCount} reminders in the SMS queue!`);
    setSelectedBulkReminderTxnIds([]);
    refreshData();
  };

  // Autocomplete search handlers
  const handleBillingCustNameChange = (val: string) => {
    setBillingCustName(val);
    setSelectedCustomerId("");
    if (!val) {
      setNameSuggestions([]);
      return;
    }
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setNameSuggestions(filtered);
    setPhoneSuggestions([]);
  };

  const handleBillingCustPhoneChange = (val: string) => {
    setBillingCustPhone(val);
    setSelectedCustomerId("");
    if (!val) {
      setPhoneSuggestions([]);
      return;
    }
    const filtered = customers.filter(c => 
      c.phone.includes(val)
    );
    setPhoneSuggestions(filtered);
    setNameSuggestions([]);
  };

  const selectCustomer = (c: any) => {
    setSelectedCustomerId(c.id);
    setBillingCustName(c.name);
    setBillingCustPhone(c.phone);
    setNameSuggestions([]);
    setPhoneSuggestions([]);
    setLoanDetails(prev => ({
      ...prev,
      father: c.father || "",
      idProof: c.idproof || "",
      address: c.address || "",
      mandal: c.mandal || ""
    }));
  };

  const matchesUniversal = (c: any, query: string) => {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    
    // 1. Check customer fields
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.phone.includes(q)) return true;
    if (c.id.toLowerCase().includes(q)) return true;
    if (c.address && c.address.toLowerCase().includes(q)) return true;
    if (c.mandal && c.mandal.toLowerCase().includes(q)) return true;
    if (c.father && c.father.toLowerCase().includes(q)) return true;
    if (c.idproof && c.idproof.toLowerCase().includes(q)) return true;

    // 2. Filter transactions belonging to this customer
    const custTxns = transactions.filter(t => t.customerId === c.id);
    for (const t of custTxns) {
      if (t.id.toLowerCase().includes(q)) return true;
      if (t.amount.toString().includes(q)) return true;
      
      // Check purchase items
      if (t.type === "purchase" && t.items) {
        for (const item of t.items) {
          if (item.particulars && item.particulars.toLowerCase().includes(q)) return true;
        }
      }
      // Check loan items
      if (t.type === "loan" && t.loanDetails && t.loanDetails.items) {
        for (const item of t.loanDetails.items) {
          if (item.name && item.name.toLowerCase().includes(q)) return true;
          if (item.remarks && item.remarks.toLowerCase().includes(q)) return true;
          if (item.yield && item.yield.toLowerCase().includes(q)) return true;
        }
      }
    }
    return false;
  };

  const handleSmsCustNameChange = (val: string) => {
    setSmsCustomerName(val);
    setSelectedSmsCustomer(null);
    if (!val) {
      setSmsCustSuggestions([]);
      return;
    }
    const filtered = customers.filter(c => 
      c.name.toLowerCase().includes(val.toLowerCase())
    );
    setSmsCustSuggestions(filtered);
  };

  const handleSmsCustPhoneChange = (val: string) => {
    setSmsCustomerPhone(val);
    setSelectedSmsCustomer(null);
    if (!val) {
      setSmsCustSuggestions([]);
      return;
    }
    const filtered = customers.filter(c => 
      c.phone.includes(val)
    );
    setSmsCustSuggestions(filtered);
  };

  // Add Item Rows dynamically
  const addPurchaseRow = () => {
    setPurchaseItems([
      ...purchaseItems,
      { id: Date.now(), particulars: "", grams: "", mg: "", qty: 1, amount: "" }
    ]);
  };

  const removePurchaseRow = (id: number) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(purchaseItems.filter(item => item.id !== id));
  };

  const updatePurchaseItem = (id: number, field: string, val: any) => {
    setPurchaseItems(purchaseItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const addLoanRow = () => {
    setLoanPledgedItems([
      ...loanPledgedItems,
      { id: Date.now(), name: "", qty: 1, yield: "", grossWeight: "", netWeight: "", value: "", remarks: "" }
    ]);
  };

  const removeLoanRow = (id: number) => {
    if (loanPledgedItems.length === 1) return;
    setLoanPledgedItems(loanPledgedItems.filter(item => item.id !== id));
  };

  const updateLoanItem = (id: number, field: string, val: any) => {
    setLoanPledgedItems(loanPledgedItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const updateOfflineLoanItem = (id: number, field: string, val: any) => {
    setOfflineLoanPledgedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const addOfflineLoanRow = () => {
    setOfflineLoanPledgedItems(prev => [
      ...prev,
      { id: Date.now(), name: "", qty: 1, yield: "", grossWeight: "", netWeight: "", remarks: "" }
    ]);
  };

  const removeOfflineLoanRow = (id: number) => {
    if (offlineLoanPledgedItems.length === 1) return;
    setOfflineLoanPledgedItems(prev => prev.filter(item => item.id !== id));
  };

  const handlePledgedItemRowChange = (
    idx: number,
    key: string,
    val: any,
    e?: React.ChangeEvent<HTMLInputElement>
  ) => {
    setOfflineLoanPledgedItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [key]: val };
      return updated;
    });

    if (key === "name" && e) {
      if (isDeleteKey.current) return;
      if (!val) return;
      const typedLower = val.toLowerCase();
      const match = uniqueItemNames.find(item => item && item.toLowerCase().startsWith(typedLower));
      if (match) {
        const typedWords = val.split(/\s+/);
        const matchWords = match.split(/\s+/);
        
        const endsWithSpace = val.endsWith(" ");
        const targetWordCount = typedWords.filter(Boolean).length + (endsWithSpace ? 1 : 0);
        
        if (targetWordCount <= matchWords.length) {
          const completedWord = matchWords.slice(0, targetWordCount).join(" ");
          if (completedWord.toLowerCase().startsWith(typedLower)) {
            const suffix = completedWord.slice(val.length);
            if (suffix) {
              const inputEl = e.target;
              const startSel = val.length;
              const completedVal = val + suffix;
              
              setOfflineLoanPledgedItems(prev => {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], name: completedVal };
                return updated;
              });
              
              requestAnimationFrame(() => {
                inputEl.setSelectionRange(startSel, completedVal.length);
              });
            }
          }
        }
      }
    }
  };

  const handleSelectPledgedItemRowSuggestion = (idx: number, name: string) => {
    setOfflineLoanPledgedItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], name };
      return updated;
    });
    setShowItemSuggestions(false);
  };

  // Handle forms submit
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingCustName.trim() || !billingCustPhone.trim()) {
      alert("Please enter customer name and phone number.");
      return;
    }

    const saveTxn = (custId: string, customerObj: any) => {
      const total = purchaseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      // Category-based sequential prefix
      const prefix = purchaseCategory === "Jewelry" ? "J-" : "F-";
      const count = transactions.filter(t => t.type === "purchase" && t.id.startsWith(prefix)).length;
      const txnId = prefix + String(count + 1).padStart(3, "0");

      const payload = {
        id: txnId,
        customerId: custId,
        type: "purchase",
        amount: total,
        category: purchaseCategory,
        date: new Date().toISOString().split("T")[0],
        items: purchaseItems.map(item => ({
          particulars: item.particulars,
          grams: parseFloat(item.grams) || 0,
          mg: parseFloat(item.mg) || 0,
          qty: parseInt(item.qty as any) || 1,
          amount: parseFloat(item.amount) || 0
        }))
      };

      fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(() => {
        alert("Purchase ticket saved successfully!");
        handlePrintTicket(payload, customerObj, "purchase");

        // Auto-save item name to catalog if it's not already in list
        purchaseItems.forEach(item => {
          if (item.particulars && item.particulars.trim()) {
            const exists = safeItems.some(i => i.name.toLowerCase() === item.particulars.trim().toLowerCase() && i.category === purchaseCategory);
            if (!exists) {
              fetch("/api/v1/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: item.particulars.trim(), category: purchaseCategory })
              });
            }
          }
        });

        // Send Thank you SMS if checked
        if (sendThankYouSms) {
          const tpl = smsTemplates.find(t => t.name === "Purchase Confirmation");
          const msg = tpl 
            ? tpl.content
                .replace("{CustomerName}", customerObj.name)
                .replace("{InvoiceNumber}", payload.id)
                .replace("{LoanAmount}", payload.amount.toLocaleString('en-IN'))
            : `ప్రియమైన ${customerObj.name}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మా వద్ద కొనుగోలు చేసినందుకు ధన్యవాదాలు! మీ బిల్ నంబర్: ${payload.id}, అమౌంట్: ₹${payload.amount.toLocaleString('en-IN')}.`;

          const smsPayload = {
            id: "SMS-" + Date.now(),
            customerId: custId,
            phone: customerObj.phone,
            message: msg,
            priority: 1,
            createdBy: "System"
          };
          fetch("/api/v1/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(smsPayload)
          });
        }

        // Reset forms
        setPurchaseItems([{ id: 1, particulars: "", grams: "", mg: "", qty: 1, amount: "" }]);
        setSelectedCustomerId("");
        setBillingCustName("");
        setBillingCustPhone("");
        setActiveTab("dashboard");
        refreshData();
      });
    };

    if (!selectedCustomerId) {
      // Create new sequential customer
      const nextCustNum = customers.filter(c => c.id.startsWith("CUST-")).length + 1;
      const newCustId = "CUST-" + String(nextCustNum).padStart(3, "0");
      const newCust = {
        id: newCustId,
        name: billingCustName,
        phone: billingCustPhone,
        address: "Gannavaram",
        father: "N/A",
        idproof: "N/A",
        mandal: "Gannavaram"
      };
      fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCust)
      })
      .then(() => {
        saveTxn(newCustId, newCust);
      });
    } else {
      const cust = customers.find(c => c.id === selectedCustomerId);
      saveTxn(selectedCustomerId, cust);
    }
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingCustName.trim() || !billingCustPhone.trim()) {
      alert("Please enter customer name and phone number.");
      return;
    }

    const saveTxn = (custId: string, customerObj: any) => {
      const totalAmount = parseFloat(loanDetails.amount) || 0;
      // Series-based loan ID
      const prefix = totalAmount > 8000 ? "L★-" : "L-";
      const count = transactions.filter(t => t.type === "loan" && t.id.startsWith(prefix)).length;
      const txnId = prefix + String(count + 1).padStart(3, "0");
      
      let endDate = loanDetails.endDate;
      if (!endDate && loanDetails.takenDate) {
        const start = new Date(loanDetails.takenDate);
        start.setFullYear(start.getFullYear() + 1);
        endDate = start.toISOString().split("T")[0];
      }

      const payload = {
        id: txnId,
        customerId: custId,
        type: "loan",
        amount: totalAmount,
        date: new Date().toISOString().split("T")[0],
        loanDetails: {
          father: loanDetails.father || "N/A",
          idProof: loanDetails.idProof || "N/A",
          interestRate: loanDetails.interestRate,
          takenDate: loanDetails.takenDate,
          endDate: endDate,
          items: loanPledgedItems.map(item => ({
            qty: parseInt(item.qty) || 1,
            name: item.name,
            yield: item.yield,
            grossWeight: parseFloat(item.grossWeight) || 0,
            netWeight: parseFloat(item.netWeight) || 0,
            value: parseFloat(item.value) || 0,
            remarks: item.remarks
          }))
        }
      };

      fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(() => {
        alert("Loan pawn ticket saved successfully!");
        handlePrintTicket(payload, customerObj, "loan");

        // Auto-save item name to catalog if it's not already in list
        loanPledgedItems.forEach(item => {
          if (item.name && item.name.trim()) {
            const exists = safeItems.some(i => i.name.toLowerCase() === item.name.trim().toLowerCase() && i.category === "Jewelry");
            if (!exists) {
              fetch("/api/v1/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: item.name.trim(), category: "Jewelry" })
              });
            }
          }
        });

        // Send Thank you SMS if checked
        // Send Thank you SMS if checked
        if (sendThankYouSms) {
          const tpl = smsTemplates.find(t => t.name === "Loan Pledge Confirmation");
          const msg = tpl 
            ? tpl.content
                .replace("{CustomerName}", customerObj.name)
                .replace("{InvoiceNumber}", payload.id)
                .replace("{LoanAmount}", payload.amount.toLocaleString('en-IN'))
            : `ప్రియమైన ${customerObj.name}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. శ్రీ సాయి బాలాజీ ని ఎంచుకున్నందుకు ధన్యవాదాలు! మీ లోన్ నంబర్: ${payload.id}, అమౌంట్: ₹${payload.amount.toLocaleString('en-IN')}.`;

          const smsPayload = {
            id: "SMS-" + Date.now(),
            customerId: custId,
            phone: customerObj.phone,
            message: msg,
            priority: 1,
            createdBy: "System"
          };
          fetch("/api/v1/sms/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(smsPayload)
          });
        }

        // Reset forms
        setLoanPledgedItems([{ id: 1, name: "", qty: 1, yield: "", grossWeight: "", netWeight: "", value: "", remarks: "" }]);
        setLoanDetails({ father: "", idProof: "", address: "", mandal: "", amount: "", interestRate: "1.5%", takenDate: new Date().toISOString().split('T')[0], endDate: "" });
        setSelectedCustomerId("");
        setBillingCustName("");
        setBillingCustPhone("");
        setActiveTab("dashboard");
        refreshData();
      });
    };

    if (!selectedCustomerId) {
      // Create new customer with sequential ID
      const nextCustNum = customers.filter(c => c.id.startsWith("CUST-")).length + 1;
      const newCustId = "CUST-" + String(nextCustNum).padStart(3, "0");
      const newCust = {
        id: newCustId,
        name: billingCustName,
        phone: billingCustPhone,
        address: loanDetails.address || "Gannavaram",
        father: loanDetails.father || "N/A",
        idproof: loanDetails.idProof || "N/A",
        mandal: loanDetails.mandal || "Gannavaram"
      };
      fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCust)
      })
      .then(() => {
        saveTxn(newCustId, newCust);
      });
    } else {
      const cust = customers.find(c => c.id === selectedCustomerId);
      saveTxn(selectedCustomerId, cust);
    }
  };

  // Print format styles injector helper
  const handlePrintTicket = (txn: any, customer: any, variant: string) => {
    setActivePrintTicket({ txn, customer, variant });
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Auto-calculated interest and release date inside loan finance inputs
  useEffect(() => {
    if (billingType === "loan") {
      let rate = "3.0%";
      const amt = parseFloat(loanDetails.amount) || 0;
      if (loanMetalType === "Gold") {
        if (amt > 8000) rate = "2.0%";
        else rate = "3.0%";
      } else {
        rate = "5.0%";
      }

      let calculatedEndDate = "";
      if (loanDetails.takenDate) {
        const start = new Date(loanDetails.takenDate);
        if (loanMetalType === "Gold") {
          start.setDate(start.getDate() + 365);
        } else {
          start.setDate(start.getDate() + 90);
        }
        calculatedEndDate = start.toISOString().split("T")[0];
      }

      setLoanDetails(prev => ({ ...prev, interestRate: rate, endDate: calculatedEndDate }));
    }
  }, [loanMetalType, loanDetails.amount, loanDetails.takenDate, billingType]);

  // Auto-calculated interest and release date for custom offline loan inputs
  useEffect(() => {
    if (showOfflineLoanModal) {
      let rate = "3.0%";
      const amt = parseFloat(offlineLoanForm.amount) || 0;
      if (offlineLoanMetalType === "Gold") {
        if (amt > 8000) rate = "2.0%";
        else rate = "3.0%";
      } else {
        rate = "5.0%";
      }

      let calculatedEndDate = "";
      if (offlineLoanForm.takenDate) {
        const start = new Date(offlineLoanForm.takenDate);
        if (offlineLoanMetalType === "Gold") {
          start.setDate(start.getDate() + 365);
        } else {
          start.setDate(start.getDate() + 90);
        }
        calculatedEndDate = start.toISOString().split("T")[0];
      }

      setOfflineLoanForm((prev: any) => ({ ...prev, interestRate: rate, endDate: calculatedEndDate }));
    }
  }, [offlineLoanMetalType, offlineLoanForm.amount, offlineLoanForm.takenDate, showOfflineLoanModal]);

  // Variables preview inside Send SMS Tab
  const getSMSPreviewText = () => {
    let preview = smsMessageText;
    
    const nameVal = selectedSmsCustomer ? selectedSmsCustomer.name : smsCustomerName;
    const phoneVal = selectedSmsCustomer ? selectedSmsCustomer.phone : smsCustomerPhone;
    
    const custTxns = selectedSmsCustomer ? transactions.filter(t => t.customerId === selectedSmsCustomer.id) : [];
    const lastTxn = custTxns.length > 0 ? custTxns[custTxns.length - 1] : null;

    const replacements: any = {
      "{CustomerName}": nameVal || "Customer",
      "{ShopName}": "Sri Sai Balaji Jewelry & Furniture",
      "{Phone}": phoneVal || "",
      "{InvoiceNumber}": lastTxn ? formatBillNoForDisplay(lastTxn.id) : "N/A",
      "{LoanAmount}": lastTxn ? lastTxn.amount.toLocaleString('en-IN') : "0",
      "{LoanEndDate}": (lastTxn && lastTxn.loanDetails) ? formatDateToDDMMYYYY(lastTxn.loanDetails.endDate || "") : "N/A",
      "{DaysLeft}": "30",
      "{ItemName}": (lastTxn && lastTxn.loanDetails?.items?.length > 0) ? lastTxn.loanDetails.items[0].name : "Item"
    };

    for (const [key, val] of Object.entries(replacements)) {
      preview = preview.replaceAll(key, val as string);
    }
    return preview;
  };

  const handleSendSMS = () => {
    if (!smsCustomerName.trim()) {
      alert("Please enter customer name.");
      return;
    }
    if (!smsCustomerPhone.trim()) {
      alert("Please enter phone number.");
      return;
    }
    if (!smsMessageText.trim()) {
      alert("Please enter message content.");
      return;
    }

    // Auto-save customer if they do not exist
    const saveAndSend = async () => {
      let custId = selectedSmsCustomer?.id;
      if (!custId && smsCustomerPhone.trim()) {
        const existing = customers.find(c => c.phone === smsCustomerPhone.trim());
        if (existing) {
          custId = existing.id;
        } else {
          custId = "CUST-" + Date.now();
          const newCustPayload = {
            id: custId,
            name: smsCustomerName.trim() || "SMS Customer",
            phone: smsCustomerPhone.trim(),
            address: "-",
            father: "-",
            idproof: "-",
            mandal: "-"
          };
          await fetch("/api/v1/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCustPayload)
          });
        }
      }

      const payload = {
        id: "SMS-" + Date.now(),
        customerId: custId || "unregistered",
        phone: smsCustomerPhone,
        message: getSMSPreviewText(),
        priority: 1,
        createdBy: "Admin"
      };

      fetch("/api/v1/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(() => {
        alert("SMS queued successfully!");
        setSmsCustomerName("");
        setSmsCustomerPhone("");
        setSelectedSmsCustomer(null);
        setSmsMessageText("");
        setSelectedTemplateName("");
        setActiveTab("sms");
        setSmsSubTab("queue");
        refreshData();
      });
    };

    saveAndSend();
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTemplateName.trim() || !editTemplateContent.trim()) {
      alert("Please enter template name and content.");
      return;
    }
    
    fetch("/api/v1/sms/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id: editTemplateId, 
        name: editTemplateName.trim(), 
        content: editTemplateContent.trim() 
      })
    })
    .then(res => res.json())
    .then(() => {
      alert("Template saved successfully!");
      setEditTemplateName("");
      setEditTemplateContent("");
      setEditTemplateId(null);
      setIsEditingTemplate(false);
      fetch("/api/v1/sms/templates").then(res => res.json()).then(setSmsTemplates);
    });
  };

  const handleDeleteTemplate = (name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;
    
    fetch("/api/v1/sms/template/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    })
    .then(res => res.json())
    .then(() => {
      alert("Template deleted successfully.");
      fetch("/api/v1/sms/templates").then(res => res.json()).then(setSmsTemplates);
    });
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLInputElement;
    const isNameField = target.placeholder === "Enter customer name...";
    const isAddressField = target.placeholder === "Enter address...";
    const isMandalField = target.placeholder === "Enter mandal...";
    const isItemField = target.placeholder && target.placeholder.startsWith("Item");

    // Determine currently active suggestions list
    let suggestionsList: any[] = [];
    if (isNameField && showCustSuggestions && offlineLoanForm.custName.trim()) {
      suggestionsList = customers.filter(c => 
        c.name.toLowerCase().includes(offlineLoanForm.custName.toLowerCase())
      ).slice(0, 8);
    } else if (isAddressField && showAddressSuggestions && offlineLoanForm.address.trim()) {
      suggestionsList = uniqueAddresses.filter(a => 
        a.toLowerCase().includes(offlineLoanForm.address.toLowerCase())
      ).slice(0, 5);
    } else if (isMandalField && showMandalSuggestions && offlineLoanForm.mandal.trim()) {
      suggestionsList = uniqueMandals.filter(m => 
        m.toLowerCase().includes(offlineLoanForm.mandal.toLowerCase())
      ).slice(0, 5);
    } else if (isItemField && showItemSuggestions && focusedItemIndex !== null) {
      const activeItem = offlineLoanPledgedItems[focusedItemIndex];
      const typedTerm = activeItem?.name || "";
      suggestionsList = uniqueItemNames.filter(name => 
        typedTerm && name.toLowerCase().includes(typedTerm.toLowerCase())
      ).slice(0, 5);
    }

    const hasSuggestions = suggestionsList.length > 0;

    if (e.key === "ArrowDown") {
      if (hasSuggestions) {
        e.preventDefault();
        setActiveSuggestIndex(prev => (prev + 1) % suggestionsList.length);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      if (hasSuggestions) {
        e.preventDefault();
        setActiveSuggestIndex(prev => (prev - 1 + suggestionsList.length) % suggestionsList.length);
      }
      return;
    }

    if (e.key === "Enter") {
      if (hasSuggestions && activeSuggestIndex >= 0 && activeSuggestIndex < suggestionsList.length) {
        e.preventDefault();
        const selected = suggestionsList[activeSuggestIndex];
        if (isNameField) {
          setOfflineLoanForm(prev => ({
            ...prev,
            custName: selected.name,
            phone: selected.phone,
            father: selected.father || "",
            idProof: selected.idproof || "",
            address: selected.address || "",
            mandal: selected.mandal || ""
          }));
          setShowCustSuggestions(false);
        } else if (isAddressField) {
          setOfflineLoanForm(prev => {
            const updated = { ...prev, address: selected };
            const lowerAddr = selected.trim().toLowerCase();
            if (lowerAddr === 'kesarapalli' || lowerAddr === 'b. b. guddem' || lowerAddr === 'b.b.guddem' || lowerAddr === 'b. b. gudem' || lowerAddr === 'b.b.gudem' || lowerAddr === 'b.b. guddem') {
              updated.mandal = 'Gannavaram';
            }
            return updated;
          });
          setShowAddressSuggestions(false);
        } else if (isMandalField) {
          setOfflineLoanForm(prev => ({ ...prev, mandal: selected }));
          setShowMandalSuggestions(false);
        } else if (isItemField && focusedItemIndex !== null) {
          handleSelectPledgedItemRowSuggestion(focusedItemIndex, selected);
          setShowItemSuggestions(false);
        }
        setActiveSuggestIndex(-1);
        return; // Select suggestion on first enter, don't move to next field yet
      }

      // Default Enter navigation behavior (if no suggestion is active)
      if (target.tagName !== "TEXTAREA" && target.getAttribute("type") !== "submit") {
        e.preventDefault();
        const form = e.currentTarget;
        const elements = Array.from(form.elements) as HTMLElement[];
        const index = elements.indexOf(target);
        
        if (index > -1) {
          let nextIndex = index + 1;
          while (nextIndex < elements.length) {
            const nextEl = elements[nextIndex];
            const tagName = nextEl.tagName;
            const type = nextEl.getAttribute("type");
            const isInputField = tagName === "INPUT" && 
                                  type !== "submit" && 
                                  type !== "button" && 
                                  type !== "checkbox" && 
                                  type !== "radio" && 
                                  type !== "hidden";
            const isSelectOrTextarea = tagName === "SELECT" || tagName === "TEXTAREA";
            const isFocusable = (isInputField || isSelectOrTextarea) && 
                                !nextEl.hasAttribute("disabled") && 
                                nextEl.tabIndex !== -1;
            
            if (isFocusable) {
              nextEl.focus();
              return;
            }
            nextIndex++;
          }
        }
      }
    }
  };

  const handleAutocompleteInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
    suggestionPool: string[]
  ) => {
    const value = e.target.value;
    
    // Update form state first
    setOfflineLoanForm(prev => {
      const updated = { ...prev, [fieldName]: value };
      
      // Auto-adjust Mandal if Address changes
      if (fieldName === 'address') {
        const lowerAddr = value.trim().toLowerCase();
        if (lowerAddr === 'kesarapalli' || lowerAddr === 'b. b. guddem' || lowerAddr === 'b.b.guddem' || lowerAddr === 'b. b. gudem' || lowerAddr === 'b.b.gudem' || lowerAddr === 'b.b. guddem') {
          updated.mandal = 'Gannavaram';
        }
      }
      return updated;
    });

    if (isDeleteKey.current) return;

    // Inline autocompletion (typeahead)
    if (!value) return;
    const typedLower = value.toLowerCase();
    const match = suggestionPool.find(item => item && item.toLowerCase().startsWith(typedLower));
    
    if (match) {
      const typedWords = value.split(/\s+/);
      const matchWords = match.split(/\s+/);
      
      const endsWithSpace = value.endsWith(" ");
      const targetWordCount = typedWords.filter(Boolean).length + (endsWithSpace ? 1 : 0);
      
      if (targetWordCount <= matchWords.length) {
        const completedText = matchWords.slice(0, targetWordCount).join(" ");
        if (completedText.toLowerCase().startsWith(typedLower)) {
          const suffix = completedText.slice(value.length);
          if (suffix) {
            const inputEl = e.target;
            const startSel = value.length;
            const endSel = completedText.length;
            
            // Set form state with suffix
            setOfflineLoanForm(prev => ({ ...prev, [fieldName]: completedText }));
            
            // Highlight/select suffix after render
            requestAnimationFrame(() => {
              inputEl.setSelectionRange(startSel, endSel);
            });
          }
        }
      }
    }
  };

  const handleSaveOfflineLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = offlineLoanForm;
    if (!form.custName.trim() || !form.amount) {
      alert("Please enter customer name and loan amount.");
      return;
    }

    try {
      // Find or create customer
      let custId = null;
      const cleanPhone = form.phone.trim();
      const cleanName = form.custName.trim().toLowerCase();
      const isValidPhone = (p: string) => {
        const clean = p.trim();
        return clean !== "" && clean !== "-" && clean !== "null" && clean !== "undefined" && clean !== "None" && clean.length > 5;
      };

      // 1. Search for an existing customer in database matching name or valid phone
      let cust = null;
      if (cleanPhone && isValidPhone(cleanPhone)) {
        cust = customers.find(c => c.phone && c.phone.trim() === cleanPhone);
      }
      if (!cust) {
        cust = customers.find(c => c.name.toLowerCase() === cleanName);
      }

      if (cust) {
        custId = cust.id;
      } else if (editingTxnId) {
        // 2. If we are editing, check if name matches the original customer name
        const existingTxn = transactions.find(t => t.id === editingTxnId);
        const originalCust = existingTxn ? customers.find(c => c.id === existingTxn.customerId) : null;
        if (originalCust && originalCust.name.toLowerCase() === cleanName) {
          // Name is the same, so we are editing details of the same customer
          custId = originalCust.id;
        }
      }

      if (!custId) {
        // 3. Name changed to a new one, so create a new customer record
        custId = "CUST-" + Date.now();
      }

      // Always save or update the customer details
      const newCustPayload = {
        id: custId,
        name: form.custName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || "Offline Address",
        father: form.father.trim() || "Offline Father",
        idproof: form.idProof.trim() || "Offline ID",
        mandal: form.mandal.trim() || "Offline Mandal"
      };
      const custRes = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustPayload)
      });
      if (!custRes.ok) throw new Error("Failed to save customer details");

      // Use existing transaction ID if editing, otherwise generate
      let txnId = editingTxnId;
      if (!txnId) {
        const billPrefix = form.starSeries ? "★" : "";
        const year = form.takenDate ? new Date(form.takenDate).getFullYear().toString() : new Date().getFullYear().toString();
        if (form.billNo.trim()) {
          // If user already typed ★ manually, don't double-add it
          const rawBill = form.billNo.trim().replace(/^[★*]/, "");
          txnId = "BILL-" + billPrefix + rawBill + "-" + year;
        } else {
          txnId = "BILL-" + billPrefix + Date.now() + "-" + year;
        }
      }
      
      // Calculate interest payments if already cleared interest upto a date
      let interestPayments: any[] = [];
      if (form.interestPaidUpto && form.interestPaidUpto !== form.takenDate) {
        interestPayments = [{
          date: new Date().toISOString().split('T')[0],
          amountPaid: form.interestAmountPaid ? Number(form.interestAmountPaid) : calculateInterestForRange(
            Number(form.amount),
            parseFloat(form.interestRate) || 0,
            form.takenDate,
            form.interestPaidUpto,
            offlineLoanMetalType
          ),
          paidUpto: form.interestPaidUpto,
          remarks: "Offline imported interest clearance"
        }];
      }

      let originalAmt = Number(form.amount);
      let updatedTopups = [...(form.topups || [])];
      let updatedAccumulatedInterest = selectedLoanTxn?.loanDetails?.accumulatedInterest || 0;
      let updatedTakenDate = form.takenDate;
      let updatedInterestPaidUpto = form.interestPaidUpto || form.takenDate;

      if (editingTxnId && form.newTopUpAmount) {
        const extra = Number(form.newTopUpAmount);
        if (extra > 0) {
          const topUpDate = form.newTopUpDate || new Date().toISOString().split('T')[0];
          const topUpRemarks = form.newTopUpRemarks || "Extra money taken";
          const originalDateStr = form.interestPaidUpto || form.takenDate;

          const d0 = new Date(originalDateStr);
          const d1 = new Date(topUpDate);
          const diffTime = Math.max(0, d1.getTime() - d0.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const diffMonths = diffDays / 30.416;

          let interestAccrued = 0;
          if (diffMonths < 1.0) {
            // Scenario A: Within 1 month
            updatedTakenDate = form.takenDate;
            updatedInterestPaidUpto = form.interestPaidUpto || form.takenDate;
          } else {
            // Scenario B: After 1 month
            const completedMonths = Math.max(1, Math.floor(diffMonths));
            const rate = (parseFloat(form.interestRate) || 0) / 100;
            interestAccrued = Math.round(originalAmt * rate * completedMonths);

            updatedAccumulatedInterest += interestAccrued;
            updatedTakenDate = topUpDate;
            updatedInterestPaidUpto = topUpDate;
          }

          updatedTopups.push({
            date: topUpDate,
            extraAmount: extra,
            oldPrincipal: originalAmt,
            newPrincipal: originalAmt + extra,
            interestAccrued: interestAccrued,
            remarks: topUpRemarks
          });

          originalAmt += extra;
        }
      }

      if (editingTxnId && form.newRepaymentAmount) {
        const repay = Number(form.newRepaymentAmount);
        if (repay > 0 && repay <= originalAmt) {
          const repDate = form.newRepaymentDate || new Date().toISOString().split('T')[0];
          const repRemarks = form.newRepaymentRemarks || "Principal Repayment";
          const originalDateStr = form.interestPaidUpto || form.takenDate;

          const d0 = new Date(originalDateStr);
          const d1 = new Date(repDate);
          const diffTime = Math.max(0, d1.getTime() - d0.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const diffMonths = diffDays / 30.416;

          let interestAccrued = 0;
          if (diffMonths < 1.0) {
            // Scenario A: Within 1 month
            updatedTakenDate = form.takenDate;
            updatedInterestPaidUpto = form.interestPaidUpto || form.takenDate;
          } else {
            // Scenario B: After 1 month
            const completedMonths = Math.max(1, Math.floor(diffMonths));
            const rate = (parseFloat(form.interestRate) || 0) / 100;
            interestAccrued = Math.round(originalAmt * rate * completedMonths);

            updatedAccumulatedInterest += interestAccrued;
            updatedTakenDate = repDate;
            updatedInterestPaidUpto = repDate;
          }

          updatedTopups.push({
            date: repDate,
            extraAmount: -repay,
            oldPrincipal: originalAmt,
            newPrincipal: originalAmt - repay,
            interestAccrued: interestAccrued,
            remarks: repRemarks,
            type: "repayment"
          });

          originalAmt -= repay;
        }
      }

      const txnPayload = {
        id: txnId,
        customerId: custId,
        type: "loan",
        amount: originalAmt,
        category: offlineLoanMetalType,
        date: form.takenDate,
        status: form.status,
        clearedDate: form.status === "Cleared" ? (form.clearedDate || new Date().toISOString().split('T')[0]) : null,
        loanDetails: {
          father: form.father.trim(),
          idProof: form.idProof.trim(),
          address: form.address.trim(),
          mandal: form.mandal.trim(),
          amount: originalAmt,
          interestRate: form.interestRate.endsWith("%") ? form.interestRate : (form.interestRate + "%"),
          takenDate: updatedTakenDate,
          endDate: form.endDate,
          clearedDate: form.status === "Cleared" ? (form.clearedDate || new Date().toISOString().split('T')[0]) : null,
          interestPaidUpto: updatedInterestPaidUpto,
          accumulatedInterest: updatedAccumulatedInterest,
          topups: updatedTopups,
          interestPayments: interestPayments,
          note: form.note.trim(),
          items: offlineLoanPledgedItems.map((item, idx) => ({
            id: idx + 1,
            name: item.name.trim() || "Pledged Item",
            qty: Number(item.qty) || 1,
            yield: form.yield.trim() || "60%",
            grossWeight: form.grossWeight.trim(),
            netWeight: form.netWeight.trim(),
            value: form.worth.trim(),
            remarks: form.remarks.trim()
          }))
        }
      };

      const txnRes = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txnPayload)
      });

      if (!txnRes.ok) throw new Error("Failed to create loan transaction");

      alert("Offline loan saved successfully!");
      setShowOfflineLoanModal(false);
      setEditingTxnId(null);
      setOfflineLoanPledgedItems([{ id: 1, name: "", qty: 1 }]);
      setOfflineLoanForm({
        billNo: "",
        custName: "",
        phone: "",
        father: "",
        idProof: "",
        address: "",
        mandal: "",
        amount: "",
        interestRate: "3.0%",
        takenDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        status: "Pending",
        interestPaidUpto: "",
        clearedDate: "",
        pledgedItemsStr: "",
        qty: "1",
        yield: "60%",
        grossWeight: "",
        netWeight: "",
        worth: "",
        remarks: "",
        interestAmountPaid: "",
        note: "",
        topups: [],
        newTopUpAmount: "",
        newTopUpDate: new Date().toISOString().split('T')[0],
        newTopUpRemarks: "",
        newRepaymentAmount: "",
        newRepaymentDate: new Date().toISOString().split('T')[0],
        newRepaymentRemarks: "",
        starSeries: false
      });
      refreshData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) {
      alert("Please paste some CSV data first.");
      return;
    }

    const lines = bulkCsvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      alert("CSV data needs to contain header row and at least one data row.");
      return;
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/[\"\']/g, ""));
    const dataRows = lines.slice(1);
    
    setBulkImportProgress({ current: 0, total: dataRows.length, status: "Starting import..." });

    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const cols = row.split(',').map(c => c.trim().replace(/[\"\']/g, ""));
      
      const getValue = (colName: string, defaultVal: string = "") => {
        const idx = header.indexOf(colName.toLowerCase());
        return (idx !== -1 && cols[idx] !== undefined) ? cols[idx] : defaultVal;
      };

      const billNo = getValue("billno");
      const custName = getValue("customername");
      const phone = getValue("phone");
      const amount = Number(getValue("amount", "0"));
      const interestRate = getValue("interestrate", "1.5%");
      const takenDate = getValue("takendate", new Date().toISOString().split('T')[0]);
      const endDate = getValue("enddate", new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
      const pledgedItems = getValue("pledgeditems", "Gold/Silver Items");
      const status = getValue("status", "Pending");
      const interestPaidUpto = getValue("interestpaidupto", takenDate);
      const clearedDate = getValue("cleareddate", "");
      
      if (!custName || !amount) {
        errorCount++;
        continue;
      }

      try {
        setBulkImportProgress({ 
          current: i + 1, 
          total: dataRows.length, 
          status: `Processing row ${i + 1} of ${dataRows.length}: ${custName}...` 
        });

        let cust = phone && phone !== "-" ? customers.find(c => c.phone === phone) : null;
        let custId = cust?.id;

        if (!custId) {
          custId = "CUST-" + Date.now() + "-" + Math.floor(Math.random()*1000);
          const newCustPayload = {
            id: custId,
            name: custName,
            phone: phone || "-",
            address: getValue("address", "-"),
            father: getValue("father", "-"),
            idproof: getValue("idproof", "-"),
            mandal: getValue("mandal", "-")
          };
          const custRes = await fetch("/api/v1/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCustPayload)
          });
          if (!custRes.ok) throw new Error("Failed to create customer " + custName);
        }

        const txnId = billNo ? "BILL-" + billNo : "TXN-OFFLINE-" + Date.now() + "-" + Math.floor(Math.random()*1000);
        
        let interestPayments: any[] = [];
        if (interestPaidUpto && interestPaidUpto !== takenDate) {
          interestPayments = [{
            date: new Date().toISOString().split('T')[0],
            amountPaid: calculateInterestForRange(amount, parseFloat(interestRate) || 0, takenDate, interestPaidUpto),
            paidUpto: interestPaidUpto,
            remarks: "Bulk imported interest clearance"
          }];
        }

        const txnPayload = {
          id: txnId,
          customerId: custId,
          type: "loan",
          amount: amount,
          category: "Jewelry",
          date: takenDate,
          status: status,
          clearedDate: status === "Cleared" ? (clearedDate || new Date().toISOString().split('T')[0]) : null,
          loanDetails: {
            father: getValue("father", "Offline Father"),
            idProof: getValue("idproof", "Offline ID"),
            address: getValue("address", "Offline Address"),
            mandal: getValue("mandal", "Offline Mandal"),
            amount: amount,
            interestRate: interestRate,
            takenDate: takenDate,
            endDate: endDate,
            clearedDate: status === "Cleared" ? (clearedDate || new Date().toISOString().split('T')[0]) : null,
            interestPaidUpto: interestPaidUpto,
            interestPayments: interestPayments,
            items: pledgedItems.split(';').map((rawName, idx) => {
              let name = rawName.trim();
              let qty = 1;
              const match = name.match(/^(\d+)\s*x?\s+(.+)$/i);
              if (match) {
                qty = parseInt(match[1]) || 1;
                name = match[2];
              }
              return {
                id: idx + 1,
                name: name,
                qty: qty,
                yield: "",
                grossWeight: "",
                netWeight: "",
                value: "",
                remarks: "Bulk Import"
              };
            })
          }
        };

        const txnRes = await fetch("/api/v1/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(txnPayload)
        });
        if (!txnRes.ok) throw new Error("Failed to save loan transaction");

        importedCount++;
      } catch (err) {
        console.error(err);
        errorCount++;
      }
    }

    setBulkImportProgress(null);
    alert(`Bulk import completed! Success: ${importedCount}, Errors/Skipped: ${errorCount}`);
    setBulkCsvText("");
    setShowBulkImportModal(false);
    refreshData();
  };

  // Mark loan as cleared passcode logic
  const handleMarkAsCleared = (txnId: string) => {
    const passcode = prompt("Enter 4-digit passcode to clear this loan:");
    if (passcode === null) return;
    if (passcode.trim() === "1004") {
      const defaultDate = new Date().toISOString().split('T')[0];
      const clearedDateInput = prompt("Enter cleared date (YYYY-MM-DD):", defaultDate);
      if (clearedDateInput === null) return;
      
      fetch("/api/v1/transactions/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnId: txnId, clearedDate: clearedDateInput })
      }).then(() => {
        // Find transaction and set to cleared locally
        setTransactions(transactions.map(t => {
          if (t.id === txnId) {
            return { 
              ...t, 
              status: "Cleared", 
              clearedDate: clearedDateInput,
              loanDetails: t.loanDetails ? { ...t.loanDetails, clearedDate: clearedDateInput } : undefined
            };
          }
          return t;
        }));
        alert("Loan marked as Cleared.");
        setSelectedLoanTxn(null);
        refreshData();
      });
    } else {
      alert("Incorrect passcode! Authorization Denied.");
    }
  };

  const handleDeleteLoan = (txnId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this loan? This action cannot be undone.")) {
      return;
    }
    const passcode = prompt("Enter 4-digit passcode to delete this loan:");
    if (passcode === null) return;
    if (passcode.trim() === "1004") {
      fetch(`/api/v1/transactions/${txnId}`, {
        method: "DELETE"
      }).then((res) => {
        if (res.ok) {
          setTransactions(transactions.filter(t => t.id !== txnId));
          alert("Loan deleted successfully.");
          setSelectedLoanTxn(null);
          refreshData();
        } else {
          alert("Failed to delete loan.");
        }
      });
    } else {
      alert("Incorrect passcode! Authorization Denied.");
    }
  };

  // Add / Edit Customer form submission
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const isNew = !customerForm.id;
    const payload = {
      ...customerForm,
      id: isNew ? "CUST-" + String(customers.length + 1).padStart(3, "0") : customerForm.id
    };

    fetch("/api/v1/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(() => {
      alert(isNew ? "New customer registered successfully!" : "Customer profile updated.");
      setShowCustomerModal(false);
      refreshData();
    });
  };

  const handleOpenAddCustomer = () => {
    setCustomerForm({ id: "", name: "", phone: "", address: "", father: "", idproof: "", mandal: "" });
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (cust: any) => {
    setCustomerForm(cust);
    setShowCustomerModal(true);
  };

  // Deduplicate case-insensitively to prevent duplicates due to case variations
  const uniqueAddressesMap = new Map<string, string>();
  customers.forEach(c => {
    if (c.address) {
      const lower = c.address.trim().toLowerCase();
      if (!uniqueAddressesMap.has(lower)) {
        uniqueAddressesMap.set(lower, c.address.trim());
      }
    }
  });
  const uniqueAddresses = Array.from(uniqueAddressesMap.values());

  const uniqueMandalsMap = new Map<string, string>();
  customers.forEach(c => {
    if (c.mandal) {
      const lower = c.mandal.trim().toLowerCase();
      if (!uniqueMandalsMap.has(lower)) {
        uniqueMandalsMap.set(lower, c.mandal.trim());
      }
    }
  });
  const uniqueMandals = Array.from(uniqueMandalsMap.values());
  const uniqueItemNames = Array.from(new Set([
    ...itemsCatalog.map(i => i.name),
    ...transactions.flatMap(t => t.loanDetails?.items?.map((i: any) => i.name) || [])
  ].filter(Boolean)));

  const getPledgedItemSearchTerm = (val: string) => {
    const parts = val.split(";");
    return parts[parts.length - 1].trim();
  };

  const handleSelectPledgedItemSuggestion = (suggestedName: string) => {
    const val = offlineLoanForm.pledgedItemsStr || "";
    const parts = val.split(";");
    parts[parts.length - 1] = " " + suggestedName; // Replace the last typed term
    const newVal = parts.join(";").trim() + "; ";
    setOfflineLoanForm(prev => ({ ...prev, pledgedItemsStr: newVal }));
    setShowItemSuggestions(false);
  };

  const activeConnectedDevice = smsDevices.find(d => d.connection === "Connected");

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50 font-sans print:bg-white text-slate-900 w-full ${theme}`}>
      
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 sidebar-premium text-slate-100 flex-col justify-between print:hidden shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <img 
              src="/saibaba.png" 
              alt="Sai Baba Logo" 
              className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-700 shadow-sm" 
            />
            <div>
              <h1 className="font-bold text-sm leading-tight text-white">Sri Sai Balaji</h1>
              <p className="text-xs text-slate-400">Jewelry & Furniture</p>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab("dashboard")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab("billing")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "billing" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <PlusCircle size={18} /> New Billing
            </button>
            <button 
              onClick={() => setActiveTab("customers")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "customers" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <Users size={18} /> Customers Data
            </button>
             <button 
              onClick={() => setActiveTab("loan-history")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "loan-history" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <History size={18} /> Loan History
            </button>
            <button 
              onClick={() => setActiveTab("sms")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "sms" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <MessageSquare size={18} /> SMS
            </button>
            <button 
              onClick={() => setActiveTab("settings")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "settings" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <Settings size={18} /> Settings
            </button>
            <button 
              onClick={() => setActiveTab("readme")} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === "readme" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <BookOpen size={18} /> Readme Guide
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Real-time Status:</span>
          <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`}></span>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 print:hidden pb-16 md:pb-0">
        
        {/* Dynamic Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 print:hidden">
          <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab.replace("-", " ")}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Active Session
          </div>
        </header>

        {/* Tab Contents */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto print:p-0 print:overflow-visible">
          
          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Total Sales Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-blue-500 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sales</h3>
                    <p className="text-xl font-extrabold mt-1 font-technical text-slate-800">
                      ₹{stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Active Loans Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-amber-500 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                    <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Loans</h3>
                    <p className="text-xl font-extrabold mt-1 font-technical text-slate-800">
                      {stats.activeLoans}
                    </p>
                  </div>
                </div>

                {/* Pledged Value Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-emerald-500 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pledged Value</h3>
                    <p className="text-xl font-extrabold mt-1 font-technical text-slate-800">
                      ₹{stats.pledgedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Total Customers Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:border-slate-500 hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center font-bold">
                    <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Customers</h3>
                    <p className="text-xl font-extrabold mt-1 font-technical text-slate-800">
                      {stats.totalCustomers}
                    </p>
                  </div>
                </div>
              </div>

              {/* SMS Bridge Widget & Recent Transactions split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm col-span-2">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Recent Transactions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-medium">
                        {transactions.slice(0, 5).map((t, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50">
                             <td className="py-3 font-technical text-slate-600">{formatDateToDDMMYYYY(t.date)}</td>
                             <td className="py-3 text-slate-800 font-semibold">{customers.find(c => c.id === t.customerId)?.name || "Unknown"}</td>
                             <td className="py-3">
                               <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${t.type === "purchase" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"}`}>{t.type}</span>
                             </td>
                             <td className="py-3 font-technical font-bold text-slate-800">₹{t.amount.toLocaleString('en-IN')}</td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg text-slate-800">SMS Bridge Device</h3>
                      {activeConnectedDevice ? (
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">🟢 Connected</span>
                      ) : (
                        <span className="text-xs font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded animate-pulse">🔴 Disconnected</span>
                      )}
                    </div>
                    <div className="space-y-3 text-sm text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span>Device ID:</span>
                        <strong className="text-slate-800">{activeConnectedDevice?.id || "-"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Battery level:</span>
                        <strong className="text-slate-800">{activeConnectedDevice ? `${activeConnectedDevice.battery}%` : "-"}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>SIM card:</span>
                        <strong className="text-slate-800">{activeConnectedDevice?.sim || "-"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-4 mt-4 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">SMS Queued</span>
                      <strong className="text-lg text-slate-800">{smsQueue.filter(s => ["Pending", "Queued", "Sending"].includes(s.status)).length}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Sent Today</span>
                      <strong className="text-lg text-emerald-600">{smsQueue.filter(s => ["Sent", "Delivered"].includes(s.status)).length}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SMS TAB */}
          {activeTab === "sms" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
              <div className="flex justify-between items-center gap-4 mb-6">
                <div>
                  <button 
                    onClick={() => setActiveTab("dashboard")}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all mb-1"
                  >
                    &larr; Back to Dashboard
                  </button>
                  <h3 className="font-bold text-lg text-slate-800">Send Custom SMS</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab("sms-queue")}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold py-2 px-4 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageSquare size={14} /> View Queue Logs
                  </button>
                  <button 
                    onClick={() => setActiveTab("sms-templates")}
                    className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2 px-4 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Settings size={14} /> Manage Templates
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Left Panel */}
                <div className="space-y-4">
                  {/* Customer Name */}
                  <div className="form-group relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Customer Name</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                      placeholder="Enter customer name..." 
                      value={smsCustomerName}
                      onChange={(e) => handleSmsCustNameChange(e.target.value)}
                    />
                    {smsCustSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto mt-1 divide-y divide-slate-50">
                        {smsCustSuggestions.map((c, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => {
                              setSelectedSmsCustomer(c);
                              setSmsCustomerName(c.name);
                              setSmsCustomerPhone(c.phone);
                              setSmsCustSuggestions([]);
                            }}
                            className="p-3 text-xs font-semibold cursor-pointer hover:bg-slate-50 flex justify-between"
                          >
                            <span>{c.name}</span>
                            <span className="text-slate-400">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="form-group relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold font-technical"
                      placeholder="Enter phone number..." 
                      value={smsCustomerPhone}
                      onChange={(e) => handleSmsCustPhoneChange(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Template</label>
                    <select 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 outline-none cursor-pointer"
                      value={selectedTemplateName}
                      onChange={(e) => {
                        setSelectedTemplateName(e.target.value);
                        const tpl = smsTemplates.find(t => t.name === e.target.value);
                        setSmsMessageText(tpl ? tpl.content : "");
                      }}
                    >
                      <option value="">-- Custom SMS (No Template) --</option>
                      {smsTemplates.map((t, idx) => (
                        <option key={idx} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Variables Helper</label>
                    <div className="flex flex-wrap gap-2">
                      {["{CustomerName}", "{ShopName}", "{InvoiceNumber}", "{LoanAmount}", "{LoanEndDate}", "{DaysLeft}", "{ItemName}"].map((v, idx) => (
                        <button 
                          key={idx} 
                          type="button" 
                          onClick={() => {
                            setSmsMessageText(prev => prev + v);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded text-xs font-semibold hover:bg-slate-200 text-slate-700"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Panel */}
                <div className="flex flex-col justify-between">
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Message Content</label>
                    <textarea 
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-slate-50 outline-none focus:border-blue-500 focus:bg-white h-32 resize-none leading-relaxed" 
                      placeholder="Write your message here..."
                      value={smsMessageText}
                      onChange={(e) => setSmsMessageText(e.target.value)}
                    ></textarea>
                    <div className="flex justify-between text-xs text-slate-400 font-semibold mt-1">
                      <span>{smsMessageText.length} characters</span>
                      <span>1 SMS = 160 characters</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                    <h5 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">Live Preview (With Variables)</h5>
                    <p className="text-sm text-slate-700 leading-relaxed font-semibold italic white-space-pre-wrap">{getSMSPreviewText() || "(Preview content will appear here...)"}</p>
                  </div>

                  <button 
                    onClick={handleSendSMS}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={16} /> Send SMS (Queue Job)
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* DEDICATED SMS QUEUE TAB */}
          {activeTab === "sms-queue" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <button 
                  onClick={() => setActiveTab("sms")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                >
                  &larr; Back to Send SMS
                </button>
              </div>
              <div className="flex justify-between items-center gap-4 mb-6">
                <h3 className="font-bold text-lg text-slate-800">SMS Queue Logs</h3>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    className="border border-slate-200 rounded-lg p-2 px-3 text-sm outline-none" 
                    placeholder="Search by phone..."
                    value={smsQueueSearch}
                    onChange={(e) => setSmsQueueSearch(e.target.value)}
                  />
                  <select 
                    className="border border-slate-200 rounded-lg p-2 text-sm outline-none cursor-pointer"
                    value={smsQueueFilter}
                    onChange={(e) => setSmsQueueFilter(e.target.value)}
                  >
                    <option value="all">All SMS</option>
                    <option value="Pending">Pending</option>
                    <option value="Queued">Queued</option>
                    <option value="Sending">Sending</option>
                    <option value="Sent">Sent</option>
                    <option value="Failed">Failed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm divide-y divide-slate-100">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="pb-3">SMS ID</th>
                      <th className="pb-3">Phone</th>
                      <th className="pb-3">Message</th>
                      <th className="pb-3">Created Time</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold">
                    {smsQueue
                      .filter(s => s.phone.includes(smsQueueSearch))
                      .filter(s => smsQueueFilter === "all" || s.status === smsQueueFilter)
                      .map((s, idx) => (
                        <tr key={idx}>
                          <td className="py-3 text-blue-600 font-technical">#{formatBillNoForDisplay(s.id || s.uuid || "")}</td>
                          <td className="py-3 font-technical">{s.phone}</td>
                          <td className="py-3 max-w-xs truncate" title={s.message}>{s.message}</td>
                          <td className="py-3 font-technical">{s.created_time}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.status === "Sent" || s.status === "Delivered" ? "bg-emerald-100 text-emerald-800" : s.status === "Failed" ? "bg-rose-100 text-rose-800" : s.status === "Sending" ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-500"}`}>{s.status}</span>
                          </td>
                          <td className="py-3 flex gap-2">
                            {["Pending", "Queued"].includes(s.status) && (
                              <button onClick={() => {
                                fetch('/api/v1/sms/cancel', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ smsId: s.id })
                                }).then(refreshData);
                              }} className="text-rose-600 hover:bg-rose-50 border border-rose-200 rounded px-2 py-1 text-xs">Cancel</button>
                            )}
                            {s.status === "Failed" && (
                              <button onClick={() => {
                                fetch('/api/v1/sms/retry', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ smsId: s.id })
                                }).then(refreshData);
                              }} className="text-blue-600 hover:bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs">Retry</button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEDICATED SMS TEMPLATES TAB */}
          {activeTab === "sms-templates" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <button 
                  onClick={() => setActiveTab("sms")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                >
                  &larr; Back to Send SMS
                </button>
              </div>
              <div className="max-w-4xl mx-auto">
                <h3 className="font-bold text-lg text-slate-800 mb-6 font-technical">Manage SMS Templates</h3>
                
                {/* Template Add/Edit Form */}
                <form onSubmit={handleSaveTemplate} className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 space-y-4">
                  <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wider mb-2">
                    {isEditingTemplate ? "✏️ Edit Template" : "➕ Add New Template"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="form-group md:col-span-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Template Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Festival Offer"
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none bg-white font-semibold"
                        value={editTemplateName}
                        onChange={(e) => setEditTemplateName(e.target.value)}
                      />
                    </div>
                    <div className="form-group md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Template Content (Variables like {"{CustomerName}"} allowed)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Dear {CustomerName}, thank you for shopping at..."
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none bg-white font-semibold"
                        value={editTemplateContent}
                        onChange={(e) => setEditTemplateContent(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    {isEditingTemplate && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditTemplateName("");
                          setEditTemplateContent("");
                          setIsEditingTemplate(false);
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
                    >
                      {isEditingTemplate ? "Update Template" : "Save Template"}
                    </button>
                  </div>
                </form>

                {/* Templates List */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                        <th className="p-4 text-xs uppercase tracking-wider w-1/4">Name</th>
                        <th className="p-4 text-xs uppercase tracking-wider w-2/3">Content</th>
                        <th className="p-4 text-xs uppercase tracking-wider w-1/12 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {smsTemplates.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-4 text-slate-900">{t.name}</td>
                          <td className="p-4 text-slate-500 text-xs font-medium max-w-md truncate" title={t.content}>{t.content}</td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditTemplateId(t.id);
                                setEditTemplateName(t.name);
                                setEditTemplateContent(t.content);
                                setIsEditingTemplate(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-blue-600 hover:bg-blue-50 border border-blue-200 rounded px-2.5 py-1 text-xs"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteTemplate(t.name)}
                              className="text-rose-600 hover:bg-rose-50 border border-rose-200 rounded px-2.5 py-1 text-xs"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* NEW BILLING TAB */}
          {activeTab === "billing" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
              <div className="mb-4">
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                >
                  &larr; Back to Dashboard
                </button>
              </div>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-6">
                <button 
                  onClick={() => setBillingType("purchase")}
                  className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${billingType === "purchase" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                >
                  Item Purchase Bill
                </button>
                <button 
                  onClick={() => setBillingType("loan")}
                  className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${billingType === "loan" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                >
                  Loan Finance Bill
                </button>
              </div>

              {/* Common Customer Selection - Name & Phone separate inputs with autocomplete */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                
                {/* Customer Name Input */}
                <div className="form-group relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Customer Name</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="Enter customer name..." 
                    value={billingCustName}
                    onChange={(e) => handleBillingCustNameChange(e.target.value)}
                  />
                  {nameSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto mt-1 divide-y divide-slate-50">
                      {nameSuggestions.map((c, idx) => (
                        <div 
                          key={idx}
                          onClick={() => selectCustomer(c)}
                          className="p-3 text-xs font-semibold cursor-pointer hover:bg-slate-50 flex justify-between"
                        >
                          <span>{c.name}</span>
                          <span className="text-slate-400">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone Number Input */}
                <div className="form-group relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="Enter phone number..." 
                    value={billingCustPhone}
                    onChange={(e) => handleBillingCustPhoneChange(e.target.value)}
                  />
                  {phoneSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto mt-1 divide-y divide-slate-50">
                      {phoneSuggestions.map((c, idx) => (
                        <div 
                          key={idx}
                          onClick={() => selectCustomer(c)}
                          className="p-3 text-xs font-semibold cursor-pointer hover:bg-slate-50 flex justify-between"
                        >
                          <span>{c.name}</span>
                          <span className="text-slate-400">{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* ITEM PURCHASE BILL FORM */}
              {billingType === "purchase" && (
                <form onSubmit={handleSavePurchase} className="space-y-6">
                  <div className="flex items-center gap-6 pb-4 border-b border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Category:</label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-700">
                      <input type="radio" name="p-cat" checked={purchaseCategory === "Jewelry"} onChange={() => setPurchaseCategory("Jewelry")} /> Jewelry
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-700">
                      <input type="radio" name="p-cat" checked={purchaseCategory === "Furniture"} onChange={() => setPurchaseCategory("Furniture")} /> Furniture
                    </label>
                  </div>

                  <div className="space-y-3">
                    {purchaseItems.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 md:gap-3 items-end border-b border-slate-100 pb-3 md:pb-0 md:border-none">
                        <div className={`form-group relative ${purchaseCategory === "Jewelry" ? "col-span-12 md:col-span-4" : "col-span-12 md:col-span-7"}`}>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Name</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                            required
                            value={item.particulars}
                            onChange={(e) => {
                              const val = e.target.value;
                              updatePurchaseItem(item.id, "particulars", val);
                              if (val) {
                                const filtered = safeItems.filter(i => i.category === purchaseCategory && i.name.toLowerCase().includes(val.toLowerCase()));
                                setActiveItemSuggestions(prev => ({ ...prev, [item.id]: filtered }));
                              } else {
                                setActiveItemSuggestions(prev => ({ ...prev, [item.id]: [] }));
                              }
                            }}
                          />
                          {activeItemSuggestions[item.id]?.length > 0 && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto mt-1 divide-y divide-slate-50">
                              {activeItemSuggestions[item.id].map((suggestedItem, sIdx) => (
                                <div 
                                  key={sIdx}
                                  onClick={() => {
                                    updatePurchaseItem(item.id, "particulars", suggestedItem.name);
                                    setActiveItemSuggestions(prev => ({ ...prev, [item.id]: [] }));
                                  }}
                                  className="p-2 text-xs font-semibold cursor-pointer hover:bg-slate-50"
                                >
                                  {suggestedItem.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {purchaseCategory === "Jewelry" && (
                          <>
                            <div className="form-group col-span-6 md:col-span-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Grams (g)</label>
                              <input 
                                type="number" 
                                step="any"
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                                value={item.grams}
                                onChange={(e) => updatePurchaseItem(item.id, "grams", e.target.value)}
                              />
                            </div>
                            <div className="form-group col-span-6 md:col-span-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mg</label>
                              <input 
                                type="number" 
                                className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                                value={item.mg}
                                onChange={(e) => updatePurchaseItem(item.id, "mg", e.target.value)}
                              />
                            </div>
                          </>
                        )}
                        <div className="form-group col-span-4 md:col-span-1 col-start-auto">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Qty</label>
                          <input 
                            type="number" 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                            required
                            value={item.qty}
                            onChange={(e) => updatePurchaseItem(item.id, "qty", e.target.value)}
                          />
                        </div>
                        <div className="form-group col-span-8 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Amount (₹)</label>
                          <input 
                            type="number" 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                            required
                            value={item.amount}
                            onChange={(e) => updatePurchaseItem(item.id, "amount", e.target.value)}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-1 pb-1 flex justify-end md:justify-center">
                          <button 
                            type="button" 
                            onClick={() => removePurchaseRow(item.id)}
                            className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <button type="button" onClick={addPurchaseRow} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Add Item</button>
                    <div className="text-lg font-bold text-slate-700">
                      Total: <span className="text-blue-600">₹{purchaseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer" 
                        checked={sendThankYouSms} 
                        onChange={(e) => setSendThankYouSms(e.target.checked)} 
                      />
                      Send Thank You SMS to Customer
                    </label>
                    <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm">
                      Save & Print Invoice
                    </button>
                  </div>
                </form>
              )}

              {/* LOAN FINANCE FORM */}
              {billingType === "loan" && (
                <form onSubmit={handleSaveLoan} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Father's/Husband's Name</label>
                      <input 
                        type="text" 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none" 
                        required
                        value={loanDetails.father}
                        onChange={(e) => setLoanDetails(prev => ({ ...prev, father: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Ration/Aadhar ID Proof</label>
                      <input 
                        type="text" 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none" 
                        required
                        value={loanDetails.idProof}
                        onChange={(e) => setLoanDetails(prev => ({ ...prev, idProof: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Address</label>
                      <input 
                        type="text" 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none" 
                        required
                        placeholder="Enter address..." 
                        value={loanDetails.address}
                        onChange={(e) => setLoanDetails(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Mandal</label>
                      <input 
                        type="text" 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none" 
                        required
                        placeholder="Enter mandal..." 
                        value={loanDetails.mandal}
                        onChange={(e) => setLoanDetails(prev => ({ ...prev, mandal: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Taken Date</label>
                      <input 
                        type="date" 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none" 
                        required
                        value={loanDetails.takenDate}
                        onChange={(e) => setLoanDetails(prev => ({ ...prev, takenDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pb-4 border-b border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metal Type:</label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-700">
                      <input type="radio" name="l-metal" checked={loanMetalType === "Gold"} onChange={() => setLoanMetalType("Gold")} /> Gold
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-slate-700">
                      <input type="radio" name="l-metal" checked={loanMetalType === "Silver"} onChange={() => setLoanMetalType("Silver")} /> Silver
                    </label>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-slate-700">Pledged Items Checklist</h4>
                    {loanPledgedItems.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 md:gap-3 items-end w-full border-b border-slate-100 pb-3 md:pb-0 md:border-none">
                        <div className="form-group relative col-span-12 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Item Name</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:bg-white" 
                            required
                            placeholder="Enter item name..."
                            value={item.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateLoanItem(item.id, "name", val);
                              if (val) {
                                const filtered = safeItems.filter(i => i.category === "Jewelry" && i.name.toLowerCase().includes(val.toLowerCase()));
                                setActiveItemSuggestions(prev => ({ ...prev, [item.id]: filtered }));
                              } else {
                                setActiveItemSuggestions(prev => ({ ...prev, [item.id]: [] }));
                              }
                            }}
                          />
                          {activeItemSuggestions[item.id]?.length > 0 && (
                            <div onClick={(e) => e.stopPropagation()} className="absolute left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto mt-1 divide-y divide-slate-50">
                              {activeItemSuggestions[item.id].map((suggestedItem, sIdx) => (
                                <div 
                                  key={sIdx}
                                  onClick={() => {
                                    updateLoanItem(item.id, "name", suggestedItem.name);
                                    setActiveItemSuggestions(prev => ({ ...prev, [item.id]: [] }));
                                  }}
                                  className="p-2 text-xs font-semibold cursor-pointer hover:bg-slate-50"
                                >
                                  {suggestedItem.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="form-group col-span-3 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Qty</label>
                          <input 
                            type="number" 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:bg-white" 
                            required
                            min="1"
                            value={item.qty || 1}
                            onChange={(e) => updateLoanItem(item.id, "qty", e.target.value)}
                          />
                        </div>
                        <div className="form-group col-span-4 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Yield/KDM</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:bg-white" 
                            placeholder="e.g. 916"
                            value={item.yield}
                            onChange={(e) => updateLoanItem(item.id, "yield", e.target.value)}
                          />
                        </div>
                        <div className="form-group col-span-5 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gross (g)</label>
                          <input 
                            type="number" 
                            step="any"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:bg-white" 
                            required
                            placeholder="0.00"
                            value={item.grossWeight}
                            onChange={(e) => updateLoanItem(item.id, "grossWeight", e.target.value)}
                          />
                        </div>
                        <div className="form-group col-span-6 md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Net (g)</label>
                          <input 
                            type="number" 
                            step="any"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:bg-white" 
                            required
                            placeholder="0.00"
                            value={item.netWeight}
                            onChange={(e) => updateLoanItem(item.id, "netWeight", e.target.value)}
                          />
                        </div>
                        <div className="form-group col-span-6 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remarks</label>
                          <input 
                            type="text" 
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500 focus:bg-white" 
                            placeholder="Remarks..."
                            value={item.remarks}
                            onChange={(e) => updateLoanItem(item.id, "remarks", e.target.value)}
                          />
                        </div>
                        <div className="col-span-12 md:col-span-1 pb-1 flex justify-end md:justify-center">
                          <button 
                            type="button" 
                            onClick={() => removeLoanRow(item.id)}
                            className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button type="button" onClick={addLoanRow} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Add Item</button>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Loan Finance Amount (₹)</label>
                      <input 
                        type="number" 
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" 
                        required
                        value={loanDetails.amount}
                        onChange={(e) => setLoanDetails(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Interest Rate (Auto per month)</label>
                      <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-100 outline-none font-semibold text-blue-600" readOnly value={loanDetails.interestRate} />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">To be released Date</label>
                      <input type="date" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-100 outline-none font-semibold text-slate-700" readOnly value={loanDetails.endDate} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer" 
                        checked={sendThankYouSms} 
                        onChange={(e) => setSendThankYouSms(e.target.checked)} 
                      />
                      Send Thank You SMS to Customer
                    </label>
                    <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-sm">
                      Save & Print Pawn Slip
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* CUSTOMERS LIST TAB */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              {!selectedProfileCustomer && (
                <div className="mb-4">
                  <button 
                    onClick={() => setActiveTab("dashboard")}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                  >
                    &larr; Back to Dashboard
                  </button>
                </div>
              )}
              
              {/* Profile Details Overlay */}
              {selectedProfileCustomer ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-6">
                    <div>
                      <button onClick={() => setSelectedProfileCustomer(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600 mb-2 block">← BACK TO LIST</button>
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {selectedProfileCustomer.name}
                        <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{selectedProfileCustomer.id}</span>
                      </h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEditCustomer(selectedProfileCustomer)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">Edit Profile</button>
                      <button 
                        onClick={() => handleDeleteCustomer(selectedProfileCustomer.id)} 
                        className="px-4 py-2 border border-rose-200 text-rose-600 rounded-lg text-sm font-semibold hover:bg-rose-50 transition-all flex items-center gap-1.5"
                      >
                        <Trash2 size={16} /> Delete Customer
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-5 rounded-lg mb-8">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone Number</span>
                      <strong className="text-sm text-slate-700">{selectedProfileCustomer.phone}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Address</span>
                      <strong className="text-sm text-slate-700">{selectedProfileCustomer.address}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mandal</span>
                      <strong className="text-sm text-slate-700">{selectedProfileCustomer.mandal || "-"}</strong>
                    </div>
                  </div>

                  {/* Customer Purchase/Loan list */}
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-wider text-xs">Item Purchase History</h4>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Bill No</th>
                            <th className="pb-2">Category</th>
                            <th className="pb-2">Items Purchased</th>
                            <th className="pb-2">Total Amount</th>
                            <th className="pb-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {transactions
                            .filter(t => t.customerId === selectedProfileCustomer.id && t.type === "purchase")
                            .map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 font-semibold">
                                <td className="py-2.5">{formatDateToDDMMYYYY(p.date)}</td>
                                <td className="py-2.5 text-blue-600">{formatBillNoForDisplay(p.id)}</td>
                                <td className="py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.category === "Furniture" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"}`}>{p.category}</span>
                                </td>
                                <td className="py-2.5">{p.items?.map((i: any) => i.particulars).join(', ')}</td>
                                <td className="py-2.5 text-slate-700">₹{p.amount.toLocaleString('en-IN')}</td>
                                <td className="py-2.5">
                                  <button onClick={() => handlePrintTicket(p, selectedProfileCustomer, "purchase")} className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2.5 py-1 flex items-center gap-1.5 text-slate-700">
                                    Print Bill
                                  </button>
                                </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-wider text-xs">Loan Finance History</h4>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                            <th className="pb-2">Date</th>
                            <th className="pb-2">Serial No</th>
                            <th className="pb-2">Pledged Items</th>
                            <th className="pb-2">Loan Amount</th>
                            <th className="pb-2">Due Date</th>
                            <th className="pb-2">Status</th>
                            <th className="pb-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {transactions
                            .filter(t => t.customerId === selectedProfileCustomer.id && t.type === "loan")
                            .map((l, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 font-semibold">
                                <td className="py-2.5">{formatDateToDDMMYYYY(l.date)}</td>
                                <td className="py-2.5">{formatBillNoForDisplay(l.id)}</td>
                                <td className="py-2.5">{l.loanDetails?.items?.map((i: any) => i.name).join(', ')}</td>
                                <td className="py-2.5">₹{l.amount.toLocaleString('en-IN')}</td>
                                <td className="py-2.5">{formatDateToDDMMYYYY(l.loanDetails?.endDate)}</td>
                                <td className="py-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.status === "Cleared" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{l.status || "Pending"}</span>
                                </td>
                                <td className="py-2.5 flex gap-1">
                                  <button onClick={() => handlePrintTicket(l, selectedProfileCustomer, "loan")} className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2.5 py-1 text-slate-700">
                                    Print Ticket
                                  </button>
                                </td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex-1 relative max-w-sm">
                      <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        className="w-full border border-slate-200 rounded-lg p-2.5 pl-10 text-sm outline-none focus:border-blue-500" 
                        placeholder="Search customer name or phone..." 
                        value={searchCustomerQuery}
                        onChange={(e) => setSearchCustomerQuery(e.target.value)}
                      />
                    </div>
                    <button onClick={handleOpenAddCustomer} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg text-sm transition-all flex items-center gap-1.5 shadow-sm">
                      <PlusCircle size={16} /> Add Customer
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[800px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold">
                          <th className="p-4 text-xs uppercase tracking-wider">ID</th>
                          <th className="p-4 text-xs uppercase tracking-wider">Customer Name</th>
                          <th className="p-4 text-xs uppercase tracking-wider">Phone</th>
                          <th className="p-4 text-xs uppercase tracking-wider">Father's Name</th>
                          <th className="p-4 text-xs uppercase tracking-wider">ID Proof</th>
                          <th className="p-4 text-xs uppercase tracking-wider">Address</th>
                          <th className="p-4 text-xs uppercase tracking-wider">Mandal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {customers
                          .filter(c => matchesUniversal(c, searchCustomerQuery))
                          .map((c, idx) => (
                            <tr key={idx} onClick={() => setSelectedProfileCustomer(c)} className="hover:bg-slate-50 cursor-pointer transition-all">
                              <td className="p-4 text-xs text-slate-400">{c.id}</td>
                              <td className="p-4 text-slate-800 font-bold text-blue-600 hover:underline">{c.name}</td>
                              <td className="p-4 text-slate-600">{c.phone}</td>
                              <td className="p-4 text-slate-600">{c.father || "-"}</td>
                              <td className="p-4 text-xs text-slate-500">{c.idproof || "-"}</td>
                              <td className="p-4 text-slate-600">{c.address || "-"}</td>
                              <td className="p-4 text-slate-600">{c.mandal || "-"}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMBINED LOAN HISTORY TAB */}
          {activeTab === "loan-history" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative">
              <div className="sticky -top-6 bg-white z-10 pt-2 pb-4 mb-4 border-b border-slate-100">
                <div className="mb-4">
                  <button 
                    onClick={() => setActiveTab("dashboard")}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                  >
                    &larr; Back to Dashboard
                  </button>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="font-bold text-lg text-slate-800">Loans</h3>
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto justify-end">
                  <button 
                    onClick={() => {
                      setEditingTxnId(null);
                      setOfflineLoanForm({
                        billNo: "",
                        custName: "",
                        phone: "",
                        father: "",
                        idProof: "",
                        address: "",
                        mandal: "",
                        amount: "",
                        interestRate: "3.0%",
                        takenDate: new Date().toISOString().split('T')[0],
                        endDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
                        status: "Pending",
                        interestPaidUpto: "",
                        clearedDate: "",
                        pledgedItemsStr: "",
                        qty: "1",
                        yield: "60%",
                        grossWeight: "",
                        netWeight: "",
                        worth: "",
                        remarks: "",
                        interestAmountPaid: "",
                        note: "",
                        topups: [],
                        newTopUpAmount: "",
                        newTopUpDate: new Date().toISOString().split('T')[0],
                        newTopUpRemarks: "",
                        newRepaymentAmount: "",
                        newRepaymentDate: new Date().toISOString().split('T')[0],
                        newRepaymentRemarks: "",
                        starSeries: false
                      });
                      setOfflineLoanPledgedItems([{ id: 1, name: "", qty: 1 }]);
                      setShowOfflineLoanModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} /> Add Offline Loan
                  </button>
                  <button 
                    onClick={() => setShowBulkImportModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload size={14} /> Bulk Import (CSV)
                  </button>
                  <button 
                    onClick={() => setActiveTab("loan-reminders")}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold py-2 px-4 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Bell size={14} /> View Loan Reminders
                  </button>
                  <input 
                    type="text" 
                    className="border border-slate-200 rounded-lg p-2 px-3 text-sm outline-none" 
                    placeholder="Search name or bill no..."
                    value={loanHistorySearch}
                    onChange={(e) => setLoanHistorySearch(e.target.value)}
                  />
                  <select 
                    className="border border-slate-200 rounded-lg p-2 text-sm outline-none cursor-pointer"
                    value={loanHistoryFilter}
                    onChange={(e) => setLoanHistoryFilter(e.target.value)}
                  >
                    <option value="all">All Loans</option>
                    <option value="pending">Pending</option>
                    <option value="cleared">Cleared</option>
                  </select>
                  <select 
                    className="border border-slate-200 rounded-lg p-2 text-sm outline-none cursor-pointer font-semibold text-slate-700 bg-white"
                    value={loanSortField}
                    onChange={(e) => setLoanSortField(e.target.value as any)}
                  >
                    <option value="date">Sort by: Date</option>
                    <option value="name">Sort by: Name</option>
                    <option value="amount">Sort by: Amount</option>
                  </select>
                  <select 
                    className="border border-slate-200 rounded-lg p-2 text-sm outline-none cursor-pointer font-semibold text-slate-700 bg-white"
                    value={loanSortOrder}
                    onChange={(e) => setLoanSortOrder(e.target.value as any)}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm divide-y divide-slate-100">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="pb-3 pr-4">Bill No</th>
                      <th className="pb-3 pr-4">Customer Name</th>
                      <th className="pb-3 pr-4">Pledged Items</th>
                      <th className="pb-3 pr-4">Qty</th>
                      <th className="pb-3 pr-4">Gross Wt (g)</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">Loan Taken Date</th>
                      <th className="pb-3 pr-4">Interest Generated</th>
                      <th className="pb-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold">
                    {transactions
                      .filter(t => t.type === "loan")
                      .filter(t => {
                        const cust = customers.find(c => c.id === t.customerId);
                        const custName = cust ? cust.name.toLowerCase() : "";
                        const billNo = formatBillNoForDisplay(t.id).toLowerCase();
                        
                        const matchesSearch = custName.includes(loanHistorySearch.toLowerCase()) || billNo.includes(loanHistorySearch.toLowerCase());
                        
                        const status = t.status || "Pending";
                        const matchesFilter = loanHistoryFilter === "all"
                          || (loanHistoryFilter === "pending" && status === "Pending")
                          || (loanHistoryFilter === "cleared" && status === "Cleared");
                        
                        return matchesSearch && matchesFilter;
                      })
                      .sort((a, b) => {
                        let valA: any = "";
                        let valB: any = "";
                        
                        if (loanSortField === "date") {
                          valA = a.loanDetails?.takenDate || a.date || "";
                          valB = b.loanDetails?.takenDate || b.date || "";
                        } else if (loanSortField === "name") {
                          const custA = customers.find(c => c.id === a.customerId);
                          const custB = customers.find(c => c.id === b.customerId);
                          valA = custA ? custA.name.toLowerCase() : "";
                          valB = custB ? custB.name.toLowerCase() : "";
                        } else if (loanSortField === "amount") {
                          valA = Number(a.amount) || 0;
                          valB = Number(b.amount) || 0;
                        }
                        
                        if (valA < valB) return loanSortOrder === "asc" ? -1 : 1;
                        if (valA > valB) return loanSortOrder === "asc" ? 1 : -1;
                        return 0;
                      })
                      .map((t, idx) => {
                        const cust = customers.find(c => c.id === t.customerId);
                        const totalQty = t.loanDetails?.items?.reduce((s: number, i: any) => s + (Number(i.qty) || 1), 0) || 1;
                        const grossWeight = t.loanDetails?.items?.[0]?.grossWeight || "";
                        return (
                          <tr key={idx} onClick={() => setSelectedLoanTxn(t)} className="hover:bg-slate-50/50 cursor-pointer">
                            <td className="py-3 pr-4 text-blue-600">#{formatBillNoForDisplay(t.id)}</td>
                            <td className="py-3 pr-4">{cust?.name || "Unknown"}</td>
                            <td className="py-3 pr-4">{t.loanDetails?.items?.map((i: any) => i.name).join(', ')}</td>
                            <td className="py-3 pr-4 text-slate-500">{totalQty}</td>
                            <td className="py-3 pr-4 text-slate-500">{grossWeight ? grossWeight + " g" : "-"}</td>
                            <td className="py-3 pr-4 font-bold text-slate-800">₹{t.amount.toLocaleString('en-IN')}</td>
                            <td className="py-3 pr-4">{formatDateToDDMMYYYY(t.loanDetails?.takenDate || t.date)}</td>
                            <td className="py-3 pr-4 text-rose-500">₹{getLoanInterest(t).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="py-3 pr-4">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === "Cleared" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{t.status || "Pending"}</span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}



          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <button 
                  onClick={() => setActiveTab("dashboard")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                >
                  &larr; Back to Dashboard
                </button>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-4">SMS Device Bridge Configuration</h3>
              <p className="text-xs text-slate-400 font-semibold mb-6">Manage registered Android Bridge devices. WebSocket connections dynamically route the pending queue automatically.</p>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm divide-y divide-slate-100">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold">
                      <th className="pb-3">Device UUID</th>
                      <th className="pb-3">Device Name</th>
                      <th className="pb-3">Model</th>
                      <th className="pb-3">Battery</th>
                      <th className="pb-3">SIM operator</th>
                      <th className="pb-3">Connection</th>
                      <th className="pb-3">Last Seen</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold">
                    {smsDevices.map((d, idx) => (
                      <tr key={idx}>
                        <td className="py-3 text-slate-400">#{d.id}</td>
                        <td className="py-3">{d.name}</td>
                        <td className="py-3">{d.model}</td>
                        <td className="py-3">{d.battery}%</td>
                        <td className="py-3">{d.sim}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${d.connection === "Connected" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{d.connection}</span>
                        </td>
                        <td className="py-3">{d.last_seen}</td>
                        <td className="py-3">
                          <button 
                            onClick={() => {
                              if (confirm("Remove registered device?")) {
                                fetch('/api/v1/devices/unregister', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: d.id })
                                }).then(refreshData);
                              }
                            }}
                            className="text-rose-500 hover:bg-rose-50 rounded px-2 py-1 text-xs border border-rose-200"
                          >
                            Unregister
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div 
                  onClick={() => setShowConnectionGuide(!showConnectionGuide)} 
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <h4 className="font-bold text-sm text-slate-800">How to Connect your Android Phone & Send SMS</h4>
                  <button className="text-xs bg-white hover:bg-slate-100 border border-slate-200 rounded px-2.5 py-1 font-semibold text-slate-600">
                    {showConnectionGuide ? "Hide Guide" : "Show Guide"}
                  </button>
                </div>
                {showConnectionGuide && (
                  <ol className="list-decimal list-inside text-xs text-slate-600 font-semibold space-y-2.5 mt-4 pt-4 border-t border-slate-100/50">
                    <li>Install the <strong>SmartShop SMS Bridge</strong> Android app on your phone.</li>
                    <li>Find your laptop's Local IP address (e.g. on Windows, open Command Prompt, run <code>ipconfig</code>, and copy your <strong>IPv4 Address</strong>, e.g. <code>192.168.1.15</code>).</li>
                    <li>In the Android app, enter the Server URL as: <code>http://&lt;your-laptop-ip&gt;:8000</code> (example: <code>http://192.168.1.15:8000</code>).</li>
                    <li>Enter a Device Name for identification, then click <strong>Register Device</strong>.</li>
                    <li>Refresh this settings page on your browser to see your device in the list above.</li>
                    <li>In the Android app, click the green <strong>Connect</strong> button. The status badge will change to <span className="text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200 font-bold uppercase">Connected</span> and any pending SMS will send immediately!</li>
                  </ol>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <h4 className="font-bold text-sm text-slate-800 mb-3">Other Settings</h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {theme === "dark" ? (
                          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
                        ) : (
                          <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                        )}
                        System Theme Settings
                      </h5>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">Toggle between Light and Dark mode interface.</p>
                    </div>
                    <div className="flex bg-slate-200/50 p-1 rounded-lg">
                      <button 
                        type="button" 
                        onClick={() => handleToggleTheme("light")}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${theme === "light" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Light
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleToggleTheme("dark")}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${theme === "dark" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                  <div 
                    onClick={() => setActiveTab("item-catalog")}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    <div>
                      <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <List size={16} className="text-blue-600" /> Item Catalog Settings
                      </h5>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">Add, edit, or delete items from the auto-suggestion lists for sales and loans.</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ITEM CATALOG TAB */}
          {activeTab === "item-catalog" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <button 
                  onClick={() => setActiveTab("settings")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all"
                >
                  &larr; Back to Settings
                </button>
              </div>
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Manage Item Catalog</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage items used in sales and loans to populate auto-suggestions list.</p>
                </div>
                <button 
                  onClick={() => {
                    setItemForm({ id: "", name: "", category: "Jewelry" });
                    setShowItemModal(true);
                  }} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle size={14} /> Add New Item
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Jewelry List */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-700 mb-3 border-b border-slate-200 pb-2 flex justify-between items-center">
                    <span>Jewelry Items</span>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {safeItems.filter(i => i.category === "Jewelry").length} items
                    </span>
                  </h4>
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {safeItems
                      .filter(i => i.category === "Jewelry")
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 text-xs font-semibold">
                          <span className="text-slate-800">{item.name}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setItemForm(item);
                                setShowItemModal(true);
                              }} 
                              className="text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this item?")) {
                                  fetch(`/api/v1/items/${item.id}`, { method: "DELETE" }).then(refreshData);
                                }
                              }} 
                              className="text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Furniture List */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h4 className="font-bold text-sm text-slate-700 mb-3 border-b border-slate-200 pb-2 flex justify-between items-center">
                    <span>Furniture Items</span>
                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {safeItems.filter(i => i.category === "Furniture").length} items
                    </span>
                  </h4>
                  <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    {safeItems
                      .filter(i => i.category === "Furniture")
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 text-xs font-semibold">
                          <span className="text-slate-800">{item.name}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setItemForm(item);
                                setShowItemModal(true);
                              }} 
                              className="text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this item?")) {
                                  fetch(`/api/v1/items/${item.id}`, { method: "DELETE" }).then(refreshData);
                                }
                              }} 
                              className="text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-100"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* README GUIDE TAB */}
          {activeTab === "readme" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 border border-slate-800 rounded-xl p-6 shadow-lg text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="font-bold text-xl">Interactive System Guide</h3>
                </div>
                <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Welcome to the Sri Sai Balaji interactive user manual. Explore features, configuration steps, and troubleshooting guides to manage your store and loans efficiently.
                </p>
              </div>

              {/* Sub-tabs inside Readme */}
              <div className="flex border-b border-slate-200 gap-4">
                {["Overview", "SMS Bridge App", "Bulk Import Guide", "FAQs"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setReadmeSubTab(tab)}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all px-1 ${
                      readmeSubTab === tab 
                        ? "border-blue-600 text-blue-600" 
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Readme content based on sub-tab */}
              {readmeSubTab === "Overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h4 className="font-bold text-base text-slate-800 mb-3">✨ Core Capabilities</h4>
                    <ul className="space-y-3 text-sm text-slate-600">
                      <li className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <strong>New Billing</strong>: Print invoices instantly with automated SGST/CGST, multi-item catalogs, and dynamic barcode/bill numbers.
                        </div>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <strong>Offline Loans</strong>: Record jewelry/furniture details, custom monthly interest rates, Taken Date, and Period End dates.
                        </div>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <strong>Custom Cleared Dates</strong>: Fully log the exact closing/clearance date for loans and display it dynamically in details and records.
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h4 className="font-bold text-base text-slate-800 mb-3">🛠️ System Architecture</h4>
                    <div className="flex flex-col gap-3 text-sm text-slate-600">
                      <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="font-bold text-slate-700">Frontend Web UI</span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">Next.js (Vite/Turbopack)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="font-bold text-slate-700">Backend Server API</span>
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold">FastAPI + Python Uvicorn</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="font-bold text-slate-700">Database</span>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-semibold">PostgreSQL (Supabase)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg">
                        <span className="font-bold text-slate-700">Real-time Sync</span>
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">WebSockets Connection</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {readmeSubTab === "SMS Bridge App" && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                  <div>
                    <h4 className="font-bold text-base text-slate-800 mb-2">📱 Android Foreground Service & Connection</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      The Android app uses a dedicated <strong>Foreground Service</strong> to stay connected in the background. It will automatically reconnect when your phone starts up (using the boot receiver) and maintains a highly battery-efficient network connection.
                    </p>
                    
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 text-sm text-slate-600 font-semibold">
                      <div className="flex items-start gap-2.5">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Open the <strong>SmartShop SMS Bridge</strong> app on your Android device.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Input Server URL: <code className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">http://&lt;your-local-ip&gt;:8000</code>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-blue-600 font-bold">3.</span>
                        <span>Click <strong>Register Device</strong>, then click <strong>Connect</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-blue-600 font-bold">4.</span>
                        <span>Make sure to allow <strong>SMS and Notification permissions</strong> when prompted!</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h5 className="font-bold text-sm text-slate-800 mb-2">⚙️ Background Operation & Keep-Alive</h5>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      To comply with battery optimization settings, our app runs pings once every 60 seconds. This avoids continuous radio wake-ups, preserving battery life while ensuring that you receive real-time SMS requests instantly whenever you trigger reminders or billing alerts on the laptop.
                    </p>
                  </div>
                </div>
              )}

              {readmeSubTab === "Bulk Import Guide" && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                  <div>
                    <h4 className="font-bold text-base text-slate-800 mb-2">📂 Upload Template Details</h4>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      When using the Bulk Import tool, you paste standard CSV rows. You can leave optional columns empty (e.g. `,,`), specify item quantities using `2x ItemName`, and log custom cleared dates!
                    </p>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CSV Headers Template</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText("BillNo,CustomerName,Phone,Amount,InterestRate,TakenDate,EndDate,PledgedItems,Status,InterestPaidUpto,Father,IdProof,Address,Mandal,ClearedDate");
                            alert("Headers copied to clipboard!");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                        >
                          Copy Headers
                        </button>
                      </div>
                      <code className="block bg-slate-800 text-slate-200 p-3 rounded font-mono text-xs font-bold select-all leading-normal break-all">
                        BillNo,CustomerName,Phone,Amount,InterestRate,TakenDate,EndDate,PledgedItems,Status,InterestPaidUpto,Father,IdProof,Address,Mandal,ClearedDate
                      </code>
                    </div>

                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Example Pasteable Data</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`101,Rajesh,9876543210,15000,1.5%,2025-01-10,2026-01-10,2x Gold Ring;1x Gold Chain,Cleared,2025-04-10,,,Chennai,,2025-04-10\n102,Karan,,8000,2.0%,2025-02-15,2026-02-15,1x Silver Plate,Pending,2025-02-15,,,Mandal-A,,`);
                            alert("Sample rows copied to clipboard!");
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                        >
                          Copy Sample Rows
                        </button>
                      </div>
                      <code className="block bg-slate-800 text-slate-200 p-3 rounded font-mono text-xs font-bold select-all leading-relaxed whitespace-pre overflow-x-auto">
{`101,Rajesh,9876543210,15000,1.5%,2025-01-10,2026-01-10,2x Gold Ring;1x Gold Chain,Cleared,2025-04-10,,,Chennai,,2025-04-10
102,Karan,,8000,2.0%,2025-02-15,2026-02-15,1x Silver Plate,Pending,2025-02-15,,,Mandal-A,,`}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {readmeSubTab === "FAQs" && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <h4 className="font-bold text-base text-slate-800 mb-2">💬 Frequently Asked Questions</h4>
                  
                  <div className="divide-y divide-slate-100">
                    <div className="py-3">
                      <h5 className="font-bold text-sm text-slate-800 mb-1">Q: How do I skip SMS for old customers who don't have phone numbers?</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        A: Simply leave the phone number blank or enter <code>-</code>. The backend automatically checks for this and skips queueing SMS messages for them.
                      </p>
                    </div>

                    <div className="py-3">
                      <h5 className="font-bold text-sm text-slate-800 mb-1">Q: What happens if I send a custom SMS to a number not saved in customers database?</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        A: The system automatically registers and creates a profile for that customer in the database so you can track them in the future!
                      </p>
                    </div>

                    <div className="py-3">
                      <h5 className="font-bold text-sm text-slate-800 mb-1">Q: How do I change the system theme background?</h5>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        A: Go to <strong>Settings &rarr; Other Settings</strong> to toggle between Light and Pure Black theme modes instantly!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LOAN REMINDERS TAB */}
          {activeTab === "loan-reminders" && (
            <div className="space-y-4">
              <button 
                onClick={() => setActiveTab("loan-history")} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-all"
              >
                ← BACK TO LOAN HISTORY
              </button>

              {/* BULK BROADCAST REMINDER PANEL */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-blue-600" /> Bulk Broadcast Reminder (One-Click SMS)
                    </h4>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      Draft a message and send it to all customers with pending (due/overdue) loans in one click.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        const pendingWithPhones = remindersStatus.filter(r => r.daysLeft <= 0 && r.phone && r.phone !== "-");
                        setSelectedBulkReminderTxnIds(pendingWithPhones.map(r => r.loanId));
                      }}
                      className="px-3 py-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold rounded-lg text-xs transition-all bg-white"
                    >
                      Select All Pending Loans ({remindersStatus.filter(r => r.daysLeft <= 0 && r.phone && r.phone !== "-").length})
                    </button>
                    {selectedBulkReminderTxnIds.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setSelectedBulkReminderTxnIds([])}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-xs transition-all bg-white"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-400 block">Edit SMS Message Template</label>
                    <textarea 
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none bg-white font-semibold text-slate-700 focus:border-blue-500 transition-colors"
                      value={bulkReminderMessage}
                      onChange={(e) => setBulkReminderMessage(e.target.value)}
                    />
                    <div className="text-[10px] text-slate-400 font-semibold flex gap-3">
                      <span>Use <strong>{`{CustomerName}`}</strong> and <strong>{`{LoanId}`}</strong> as automatic placeholders.</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Selected Recipients</span>
                      <span className="text-xl font-extrabold text-blue-600">{selectedBulkReminderTxnIds.length} Customers</span>
                      {selectedBulkReminderTxnIds.length > 0 && (
                        <div className="max-h-20 overflow-y-auto text-[10px] text-slate-500 font-semibold space-y-0.5 mt-2 bg-white p-1.5 rounded border border-slate-200">
                          {selectedBulkReminderTxnIds.map(txnId => {
                            const r = remindersStatus.find(rem => rem.loanId === txnId);
                            return r ? (
                              <div key={txnId} className="flex justify-between">
                                <span>{r.customerName}</span>
                                <span className="text-slate-400">{r.phone}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      disabled={selectedBulkReminderTxnIds.length === 0}
                      onClick={handleSendBulkReminders}
                      className="w-full mt-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Send size={12} /> Send Bulk Reminders
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Automated Loan Reminders</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Automated SMS warnings are sent in Telugu at 30 days left and 7 days left before maturity.</p>
                </div>
                <button 
                  onClick={() => {
                    fetch("/api/v1/loans/trigger-reminders", { method: "POST" })
                      .then(res => res.json())
                      .then(data => {
                        alert(`Reminder check completed! Sent ${data.count} reminders successfully.`);
                        refreshData();
                      });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Bell size={14} /> Scan & Send Reminders
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm divide-y divide-slate-100">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-bold">
                      <th className="pb-3 text-xs uppercase tracking-wider">Loan ID</th>
                      <th className="pb-3 text-xs uppercase tracking-wider">Customer Name</th>
                      <th className="pb-3 text-xs uppercase tracking-wider">Phone</th>
                      <th className="pb-3 text-xs uppercase tracking-wider">Amount</th>
                      <th className="pb-3 text-xs uppercase tracking-wider">Release Date</th>
                      <th className="pb-3 text-xs uppercase tracking-wider">Days Left</th>
                      <th className="pb-3 text-xs uppercase tracking-wider text-center">30-Day Reminder</th>
                      <th className="pb-3 text-xs uppercase tracking-wider text-center">7-Day Reminder</th>
                      <th className="pb-3 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {remindersStatus.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400 text-xs font-semibold">
                          No active loans found.
                        </td>
                      </tr>
                    ) : (
                      remindersStatus.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3.5 text-blue-600">#{formatBillNoForDisplay(r.loanId)}</td>
                          <td className="py-3.5 text-slate-800">{r.customerName}</td>
                          <td className="py-3.5 text-slate-500 text-xs">{r.phone}</td>
                          <td className="py-3.5">₹{r.amount.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 text-xs">{formatDateToDDMMYYYY(r.endDate)}</td>
                          <td className="py-3.5">
                            {r.daysLeft <= 0 ? (
                              <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                Overdue ({Math.abs(r.daysLeft)}d ago)
                              </span>
                            ) : r.daysLeft <= 30 ? (
                              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                {r.daysLeft} days left
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                {r.daysLeft} days left
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-center">
                            {r.sent30Day ? (
                              <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-full">Sent</span>
                            ) : (
                              <span className="text-slate-400 text-xs bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-full">Not Sent</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center">
                            {r.sent7Day ? (
                              <span className="text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 border border-emerald-200 rounded-full">Sent</span>
                            ) : (
                              <span className="text-slate-400 text-xs bg-slate-50 px-2 py-0.5 border border-slate-200 rounded-full">Not Sent</span>
                            )}
                          </td>
                          <td className="py-3.5">
                            <button
                              onClick={() => {
                                const tplName = r.daysLeft <= 7 ? "Loan Warning (7 Days)" : "Loan Warning (30 Days)";
                                const tpl = smsTemplates.find(t => t.name === tplName);
                                const defaultMsg = tplName === "Loan Warning (7 Days)"
                                  ? `ప్రియమైన ${r.customerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ గడువు ముగియడానికి ఇంకా 7 రోజులు మాత్రమే మిగిలి ఉంది (లోన్ నంబర్: ${r.loanId}). త్వరగా చెల్లించవలసిందిగా కోరుతున్నాము, లేనిచో అదనపు వడ్డీ వసూలు చేయబడుతుంది.`
                                  : `ప్రియమైన ${r.customerName}, శ్రీ సాయి బాలాజీ జ్యువెలర్స్ & ఫర్నిచర్ నుండి నమస్కారములు. మీ లోన్ గడువు ముగియడానికి ఇంకా 30 రోజులు మాత్రమే మిగిలి ఉంది (లోన్ నంబర్: ${r.loanId}). దయచేసి గమనించగలరు.`;
                                const fallbackMessage = tpl 
                                  ? tpl.content
                                      .replace("{CustomerName}", r.customerName)
                                      .replace("{InvoiceNumber}", r.loanId)
                                  : defaultMsg;
                                const msg = prompt(
                                  "Enter Telugu reminder custom message or click OK to send standard warning Telugu SMS:",
                                  fallbackMessage
                                );
                                if (msg === null) return;
                                
                                fetch("/api/v1/sms/send", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    id: "SMS-" + Date.now(),
                                    customerId: r.customerId,
                                    phone: r.phone,
                                    message: msg,
                                    priority: 1
                                  })
                                }).then(() => {
                                  alert("Telugu SMS Reminder queued successfully!");
                                  refreshData();
                                });
                              }}
                              className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2.5 py-1 text-slate-700"
                            >
                              Send SMS Now
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* LOAN SUMMARY DETAILS MODAL */}
      {selectedLoanTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-xl p-6 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-lg text-slate-800">Loan Summary Details</h3>
                <button onClick={() => setSelectedLoanTxn(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 mb-4 pb-4 border-b border-slate-100 divide-y divide-slate-50">
                <div><strong>Bill No:</strong> {formatBillNoForDisplay(selectedLoanTxn.id)}</div>
                <div className="pt-0"><strong>Date:</strong> {formatDateToDDMMYYYY(selectedLoanTxn.date)}</div>
                <div className="pt-2"><strong>Pledger Name:</strong> {customers.find(c => c.id === selectedLoanTxn.customerId)?.name || "Unknown"}</div>
                <div className="pt-2"><strong>Father's Name:</strong> {selectedLoanTxn.loanDetails?.father || "-"}</div>
                <div className="pt-2"><strong>ID Proof:</strong> {selectedLoanTxn.loanDetails?.idProof || "-"}</div>
                <div className="pt-2"><strong>Phone No:</strong> {customers.find(c => c.id === selectedLoanTxn.customerId)?.phone || "-"}</div>
                <div className="pt-2"><strong>Address:</strong> {selectedLoanTxn.loanDetails?.address || customers.find(c => c.id === selectedLoanTxn.customerId)?.address || "-"}</div>
                <div className="pt-2"><strong>Mandal:</strong> {selectedLoanTxn.loanDetails?.mandal || customers.find(c => c.id === selectedLoanTxn.customerId)?.mandal || "-"}</div>
              </div>

              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Pledged Items</h4>
              <table className="w-full text-left text-xs divide-y divide-slate-100 mb-4 border border-slate-100 rounded-lg">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold">
                    <th className="p-2">Qty</th>
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Yield</th>
                    <th className="p-2">Gross</th>
                    <th className="p-2">Net</th>
                    <th className="p-2">Worth</th>
                    <th className="p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold">
                  {selectedLoanTxn.loanDetails?.items?.map((item: any, idx: number) => {
                    const isMulti = (selectedLoanTxn.loanDetails?.items?.length || 0) > 1;
                    return (
                      <tr key={idx}>
                        <td className="p-2">{item.qty}</td>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">{isMulti ? "-" : (item.yield || "-")}</td>
                        <td className="p-2">{isMulti ? "-" : (item.grossWeight ? item.grossWeight + "g" : "-")}</td>
                        <td className="p-2">{isMulti ? "-" : (item.netWeight ? item.netWeight + "g" : "-")}</td>
                        <td className="p-2">{isMulti ? "-" : (item.value ? "₹" + Number(item.value).toLocaleString('en-IN') : "-")}</td>
                        <td className="p-2 text-slate-500 font-medium">{item.remarks || "-"}</td>
                      </tr>
                    );
                  })}
                  {/* Total summary row if multiple items */}
                  {((selectedLoanTxn.loanDetails?.items?.length || 0) > 1) && (() => {
                    const firstItem = selectedLoanTxn.loanDetails?.items?.[0];
                    const totalQty = selectedLoanTxn.loanDetails?.items?.reduce((s: number, i: any) => s + (Number(i.qty) || 1), 0) || 0;
                    return (
                      <tr className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-800">
                        <td className="p-2">{totalQty}</td>
                        <td className="p-2 text-slate-500">Total (Combined)</td>
                        <td className="p-2">{firstItem?.yield || "-"}</td>
                        <td className="p-2 text-slate-900">{firstItem?.grossWeight ? firstItem.grossWeight + "g" : "-"}</td>
                        <td className="p-2 text-slate-900">{firstItem?.netWeight ? firstItem.netWeight + "g" : "-"}</td>
                        <td className="p-2 text-slate-900">{firstItem?.value ? "₹" + Number(firstItem.value).toLocaleString('en-IN') : "-"}</td>
                        <td className="p-2">-</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">Financial Details</h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600 mb-4">
                  <div>Interest Rate: <strong className="text-slate-800">{selectedLoanTxn.loanDetails?.interestRate} per month</strong></div>
                  <div>Interest Generated: <strong className="text-rose-600">₹{getLoanInterest(selectedLoanTxn).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div>
                  <div>Taken Date: <strong className="text-slate-800">{formatDateToDDMMYYYY(selectedLoanTxn.loanDetails?.takenDate || selectedLoanTxn.date)}</strong></div>
                  <div>Period End: <strong className="text-slate-800">{formatDateToDDMMYYYY(selectedLoanTxn.loanDetails?.endDate)}</strong></div>
                  
                  {selectedLoanTxn.status === "Cleared" && (
                    <div className="col-span-2 text-slate-600 bg-emerald-50 border border-emerald-100 p-1.5 rounded font-bold">
                      Cleared On: <span className="font-technical text-emerald-800 ml-1">{formatDateToDDMMYYYY(selectedLoanTxn.clearedDate || selectedLoanTxn.loanDetails?.clearedDate || selectedLoanTxn.date)}</span>
                    </div>
                  )}

                  {selectedLoanTxn.loanDetails?.interestPaidUpto && 
                   selectedLoanTxn.loanDetails.interestPaidUpto !== (selectedLoanTxn.loanDetails.takenDate || selectedLoanTxn.date) && (
                    <div className="col-span-2 text-slate-600 bg-slate-100 p-1.5 rounded font-bold">
                      Last Cleared Upto: <span className="font-technical text-slate-800 ml-1">{formatDateToDDMMYYYY(selectedLoanTxn.loanDetails.interestPaidUpto)}</span>
                    </div>
                  )}

                  {selectedLoanTxn.loanDetails?.note && (
                    <div className="col-span-2 text-slate-600 bg-amber-50 border border-amber-100 p-2 rounded text-[11px]">
                      <strong>Note:</strong> <span className="italic font-medium">{selectedLoanTxn.loanDetails.note}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Principal Amount</span>
                    <span className="text-lg font-extrabold text-slate-800">₹{selectedLoanTxn.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-blue-400 uppercase tracking-wider block font-bold">Total Due</span>
                    <span className="text-lg font-extrabold text-blue-600">
                      {selectedLoanTxn.status === "Cleared" 
                        ? "₹0 (Cleared)" 
                        : `₹${(selectedLoanTxn.amount + getLoanInterest(selectedLoanTxn)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top-up History Ledger */}
              {selectedLoanTxn.loanDetails?.topups?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Principal Adjustments (Top-up / Repayment) History</h4>
                  <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-lg shadow-sm">
                    <table className="w-full text-left text-[10px] divide-y divide-slate-100">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold">
                          <th className="p-2">Date</th>
                          <th className="p-2">Adjustment Amount</th>
                          <th className="p-2">Principal Shift</th>
                          <th className="p-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-600 bg-white">
                        {selectedLoanTxn.loanDetails.topups.map((top: any, tIdx: number) => {
                          const isRepay = top.extraAmount < 0 || top.type === "repayment";
                          const displayAmt = isRepay ? `-₹${Math.abs(top.extraAmount).toLocaleString('en-IN')}` : `+₹${top.extraAmount.toLocaleString('en-IN')}`;
                          const colorClass = isRepay ? "text-emerald-600 font-bold" : "text-blue-600";
                          return (
                            <tr key={tIdx} className="hover:bg-slate-50/50">
                              <td className="p-2 font-technical">{formatDateToDDMMYYYY(top.date)}</td>
                              <td className={`p-2 font-technical ${colorClass}`}>{displayAmt}</td>
                              <td className="p-2 text-slate-500 font-technical">₹{top.oldPrincipal.toLocaleString('en-IN')} → ₹{top.newPrincipal.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-slate-400">{top.remarks}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extra Principal Additions (Top-up) Panel */}
              {selectedLoanTxn.status !== "Cleared" && (
                <div className="mb-4 bg-blue-50/30 border border-blue-100 rounded-lg p-3">
                  {!showTopUpForm ? (
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowTopUpForm(true);
                        setTopUpDate(new Date().toISOString().split('T')[0]);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <PlusCircle size={14} /> Take Extra Money (Principal Top-up)
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Add Extra Money</span>
                        <button type="button" onClick={() => setShowTopUpForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="form-group">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Extra Amount (₹)</label>
                          <input 
                            type="number" 
                            placeholder="e.g. 1000"
                            className="w-full border border-slate-200 rounded p-1.5 font-semibold bg-white"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Taken Date</label>
                          <input 
                            type="date" 
                            className="w-full border border-slate-200 rounded p-1.5 font-semibold bg-white"
                            value={topUpDate}
                            onChange={(e) => setTopUpDate(e.target.value)}
                          />
                        </div>
                        <div className="form-group col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Remarks / Reason</label>
                          <input 
                            type="text" 
                            placeholder="Remarks..."
                            className="w-full border border-slate-200 rounded p-1.5 font-semibold bg-white"
                            value={topUpRemarks}
                            onChange={(e) => setTopUpRemarks(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowTopUpForm(false)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 bg-white"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={handleSaveTopUp}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold"
                        >
                          Save Top-up
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Principal Repayment Panel */}
              {selectedLoanTxn.status !== "Cleared" && (
                <div className="mb-4 bg-emerald-50/30 border border-emerald-100 rounded-lg p-3">
                  {!showRepaymentForm ? (
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowRepaymentForm(true);
                        setRepaymentDate(new Date().toISOString().split('T')[0]);
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <PlusCircle size={14} className="text-emerald-600" /> Pay/Reduce Principal Amount (Part Payment)
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Pay Principal Amount</span>
                        <button type="button" onClick={() => setShowRepaymentForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="form-group">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Repayment Amount (₹)</label>
                          <input 
                            type="number" 
                            placeholder="e.g. 2000"
                            className="w-full border border-slate-200 rounded p-1.5 font-semibold bg-white"
                            value={repaymentAmount}
                            onChange={(e) => setRepaymentAmount(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Repayment Date</label>
                          <input 
                            type="date" 
                            className="w-full border border-slate-200 rounded p-1.5 font-semibold bg-white"
                            value={repaymentDate}
                            onChange={(e) => setRepaymentDate(e.target.value)}
                          />
                        </div>
                        <div className="form-group col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Remarks / Reason</label>
                          <input 
                            type="text" 
                            placeholder="Remarks..."
                            className="w-full border border-slate-200 rounded p-1.5 font-semibold bg-white"
                            value={repaymentRemarks}
                            onChange={(e) => setRepaymentRemarks(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowRepaymentForm(false)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 bg-white"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={handleSaveRepayment}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                        >
                          Save Repayment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interest Payment History Ledger */}
              {selectedLoanTxn.loanDetails?.interestPayments?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Interest Payment History</h4>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-lg shadow-sm">
                    <table className="w-full text-left text-[10px] divide-y divide-slate-100">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold">
                          <th className="p-2">Paid Date</th>
                          <th className="p-2">Upto Date</th>
                          <th className="p-2">Amount Paid</th>
                          <th className="p-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-semibold text-slate-600 bg-white">
                        {selectedLoanTxn.loanDetails.interestPayments.map((pay: any, pIdx: number) => (
                          <tr key={pIdx} className="hover:bg-slate-50/50">
                            <td className="p-2 font-technical">{formatDateToDDMMYYYY(pay.date)}</td>
                            <td className="p-2 font-technical">{formatDateToDDMMYYYY(pay.paidUpto)}</td>
                            <td className="p-2 font-technical text-emerald-600">₹{pay.amountPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="p-2 text-slate-500">{pay.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Record Interest Payment Section */}
              {selectedLoanTxn.status !== "Cleared" && (
                <div className="border border-blue-100 rounded-lg p-3 bg-blue-50/30 mb-4">
                  <h5 className="font-bold text-xs text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Clear Interest Till Date
                  </h5>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">Paid Upto Date</label>
                      <input 
                        type="date" 
                        className="w-full border border-slate-200 rounded-lg p-1.5 text-xs outline-none bg-white font-semibold"
                        value={interestPaidUptoDate}
                        onChange={(e) => setInterestPaidUptoDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-500 block mb-1">Calculated Interest</label>
                      <div className="p-1.5 text-xs font-bold font-technical text-rose-600 bg-white border border-slate-200 rounded-lg">
                        ₹{calculateInterestForRange(
                          selectedLoanTxn.amount,
                          parseFloat(selectedLoanTxn.loanDetails?.interestRate) || 0,
                          selectedLoanTxn.loanDetails?.interestPaidUpto || selectedLoanTxn.loanDetails?.takenDate || selectedLoanTxn.date,
                          interestPaidUptoDate,
                          selectedLoanTxn.category
                        ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Remarks (e.g. Paid cash)..."
                      className="flex-1 border border-slate-200 rounded-lg p-1.5 text-xs outline-none bg-white font-semibold"
                      value={interestRemarks}
                      onChange={(e) => setInterestRemarks(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const amt = calculateInterestForRange(
                          selectedLoanTxn.amount,
                          parseFloat(selectedLoanTxn.loanDetails?.interestRate) || 0,
                          selectedLoanTxn.loanDetails?.interestPaidUpto || selectedLoanTxn.loanDetails?.takenDate || selectedLoanTxn.date,
                          interestPaidUptoDate,
                          selectedLoanTxn.category
                        );
                        handlePayInterest(selectedLoanTxn.id, interestPaidUptoDate, amt, interestRemarks);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                    >
                      Clear Interest
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <div className="flex gap-2">
                <button onClick={() => setSelectedLoanTxn(null)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 bg-white">Close</button>
                <button 
                  onClick={() => {
                    const cust = customers.find(c => c.id === selectedLoanTxn.customerId);
                    const firstItem = selectedLoanTxn.loanDetails?.items?.[0];
                    setOfflineLoanForm({
                      billNo: selectedLoanTxn.id.startsWith("BILL-") ? selectedLoanTxn.id.replace("BILL-", "") : (selectedLoanTxn.id.startsWith("TXN-OFFLINE-") ? "" : selectedLoanTxn.id),
                      custName: cust?.name || "",
                      phone: cust?.phone || "",
                      father: selectedLoanTxn.loanDetails?.father || "",
                      idProof: selectedLoanTxn.loanDetails?.idProof || "",
                      address: selectedLoanTxn.loanDetails?.address || "",
                      mandal: selectedLoanTxn.loanDetails?.mandal || "",
                      amount: String(selectedLoanTxn.amount),
                      interestRate: selectedLoanTxn.loanDetails?.interestRate || "3.0%",
                      takenDate: selectedLoanTxn.loanDetails?.takenDate || selectedLoanTxn.date,
                      endDate: selectedLoanTxn.loanDetails?.endDate || "",
                      status: selectedLoanTxn.status || "Pending",
                      interestPaidUpto: selectedLoanTxn.loanDetails?.interestPaidUpto || "",
                      clearedDate: selectedLoanTxn.clearedDate || selectedLoanTxn.loanDetails?.clearedDate || "",
                      pledgedItemsStr: selectedLoanTxn.loanDetails?.items?.map((i: any) => i.name).join("; ") || "",
                      qty: String(firstItem?.qty || "1"),
                      yield: firstItem?.yield || "60%",
                      grossWeight: firstItem?.grossWeight || "",
                      netWeight: firstItem?.netWeight || "",
                      worth: firstItem?.value || "",
                      remarks: firstItem?.remarks || "",
                      interestAmountPaid: selectedLoanTxn.loanDetails?.interestPayments?.[0]?.amountPaid ? String(selectedLoanTxn.loanDetails.interestPayments[0].amountPaid) : "",
                      note: selectedLoanTxn.loanDetails?.note || "",
                      topups: selectedLoanTxn.loanDetails?.topups || [],
                      newTopUpAmount: "",
                      newTopUpDate: new Date().toISOString().split('T')[0],
                      newTopUpRemarks: "",
                      newRepaymentAmount: "",
                      newRepaymentDate: new Date().toISOString().split('T')[0],
                      newRepaymentRemarks: "",
                      starSeries: (() => {
                        const raw = selectedLoanTxn.id.replace("BILL-", "").replace("TXN-OFFLINE-", "");
                        return raw.startsWith("★") || raw.startsWith("*");
                      })()
                    });
                    setOfflineLoanMetalType(selectedLoanTxn.category || "Gold");
                    if (selectedLoanTxn.loanDetails?.items?.length) {
                      setOfflineLoanPledgedItems(selectedLoanTxn.loanDetails.items.map((i: any, idx: number) => ({
                        id: i.id || idx + 1,
                        name: i.name,
                        qty: i.qty || 1
                      })));
                    } else {
                      setOfflineLoanPledgedItems([{ id: 1, name: "", qty: 1 }]);
                    }
                    setEditingTxnId(selectedLoanTxn.id);
                    setSelectedLoanTxn(null);
                    setShowOfflineLoanModal(true);
                  }}
                  className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-50 bg-white flex items-center gap-1.5"
                >
                  Edit Loan
                </button>
                <button 
                  onClick={() => handleDeleteLoan(selectedLoanTxn.id)}
                  className="px-4 py-2 border border-rose-200 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-50 bg-white flex items-center gap-1.5"
                >
                  Delete Loan
                </button>
              </div>
              {selectedLoanTxn.status !== "Cleared" && (
                <button 
                  onClick={() => handleMarkAsCleared(selectedLoanTxn.id)} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1"
                >
                  <CheckCircle size={14} /> Mark as Cleared
                </button>
              )}
            </div>
          </div>
        </div>
      )}
         {/* ADD CUSTOM OFFLINE LOAN MODAL */}
      {showOfflineLoanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center p-4 overflow-y-auto items-start">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <PlusCircle className="text-emerald-600" size={20} /> Add Custom Offline Loan
              </h3>
              <button type="button" onClick={() => setShowOfflineLoanModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveOfflineLoan} onKeyDown={handleFormKeyDown} className="space-y-4 text-sm font-semibold">
              <div className="grid grid-cols-2 gap-4">
                {/* Row 1: Custom Bill No & Taken Date */}
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Bill No. Series & Number</label>
                  <div className="flex items-center gap-3 mb-1.5">
                    <label className={`flex items-center gap-1 text-xs font-bold cursor-pointer px-2.5 py-1 rounded-lg border transition-all ${!offlineLoanForm.starSeries ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="billSeries" className="hidden" checked={!offlineLoanForm.starSeries} onChange={() => {
                        setOfflineLoanForm(prev => ({ ...prev, starSeries: false }));
                      }} />
                      Normal
                    </label>
                    <label className={`flex items-center gap-1 text-xs font-bold cursor-pointer px-2.5 py-1 rounded-lg border transition-all ${offlineLoanForm.starSeries ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="billSeries" className="hidden" checked={offlineLoanForm.starSeries} onChange={() => {
                        setOfflineLoanForm(prev => ({ ...prev, starSeries: true }));
                      }} />
                      ★ Star (Above ₹10K)
                    </label>
                  </div>
                  <div className={`flex items-center border rounded-lg overflow-hidden ${offlineLoanForm.starSeries ? 'border-amber-400' : 'border-slate-200'}`}>
                    {offlineLoanForm.starSeries && (
                      <span className="px-2.5 py-2 bg-amber-400 text-white font-black text-sm select-none">★</span>
                    )}
                    <input 
                      type="text" 
                      placeholder="Enter Bill No..."
                      className={`flex-1 p-2 text-sm outline-none bg-white font-bold ${offlineLoanForm.starSeries ? 'text-amber-700' : 'text-slate-800 border-0'}`}
                      value={offlineLoanForm.billNo}
                      onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, billNo: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Taken Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.takenDate}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, takenDate: e.target.value }))}
                  />
                </div>

                {/* Row 2: Customer Name (with suggestions) */}
                <div className="form-group relative">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Customer Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter customer name..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.custName}
                    onChange={(e) => {
                      handleAutocompleteInputChange(e, "custName", customers.map(c => c.name));
                      setShowCustSuggestions(true);
                    }}
                    onFocus={() => setShowCustSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCustSuggestions(false), 200)}
                  />
                  {showCustSuggestions && offlineLoanForm.custName.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {customers.filter(c => 
                        c.name.toLowerCase().includes(offlineLoanForm.custName.toLowerCase())
                      ).slice(0, 8).map((c, index) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setOfflineLoanForm(prev => ({
                              ...prev,
                              custName: c.name,
                              phone: c.phone,
                              father: c.father || "",
                              idProof: c.idproof || "",
                              address: c.address || "",
                              mandal: c.mandal || ""
                            }));
                            setShowCustSuggestions(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-slate-100 last:border-0 transition-colors ${
                            activeSuggestIndex === index 
                              ? 'bg-blue-600 text-white' 
                              : 'hover:bg-blue-50 text-slate-700'
                          }`}
                        >
                          {c.name} ({c.phone} - {c.address})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 3: Father's/Husband's Name */}
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Father's/Husband's Name</label>
                  <input 
                    type="text" 
                    placeholder="Father's/Husband's Name..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.father}
                    onChange={(e) => handleAutocompleteInputChange(e, "father", customers.map(c => c.father).filter(Boolean))}
                  />
                </div>

                {/* Row 4: Ration/Aadhar ID Proof & Phone Number (side-by-side) */}
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Ration/Aadhar ID Proof</label>
                  <input 
                    type="text" 
                    placeholder="ID Proof..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.idProof}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, idProof: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="Enter phone number (optional)..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.phone}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                {/* Row 5: Address (with suggestions) */}
                <div className="form-group relative">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Address</label>
                  <input 
                    type="text" 
                    placeholder="Enter address..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.address}
                    onChange={(e) => {
                      handleAutocompleteInputChange(e, "address", uniqueAddresses);
                      setShowAddressSuggestions(true);
                    }}
                    onFocus={() => setShowAddressSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                  />
                  {showAddressSuggestions && offlineLoanForm.address.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                      {uniqueAddresses.filter(a => 
                        a.toLowerCase().includes(offlineLoanForm.address.toLowerCase())
                      ).slice(0, 5).map((addr, index) => (
                        <button
                          key={addr}
                          type="button"
                          onMouseDown={() => {
                            setOfflineLoanForm(prev => {
                              const updated = { ...prev, address: addr };
                              const lowerAddr = addr.trim().toLowerCase();
                              if (lowerAddr === 'kesarapalli' || lowerAddr === 'b. b. guddem' || lowerAddr === 'b.b.guddem' || lowerAddr === 'b. b. gudem' || lowerAddr === 'b.b.gudem' || lowerAddr === 'b.b. guddem') {
                                updated.mandal = 'Gannavaram';
                              }
                              return updated;
                            });
                            setShowAddressSuggestions(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-slate-100 last:border-0 transition-colors ${
                            activeSuggestIndex === index 
                              ? 'bg-blue-600 text-white' 
                              : 'hover:bg-blue-50 text-slate-700'
                          }`}
                        >
                          {addr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 6: Mandal (with suggestions) */}
                <div className="form-group relative">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Mandal</label>
                  <input 
                    type="text" 
                    placeholder="Enter mandal..."
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.mandal}
                    onChange={(e) => {
                      handleAutocompleteInputChange(e, "mandal", uniqueMandals);
                      setShowMandalSuggestions(true);
                    }}
                    onFocus={() => setShowMandalSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowMandalSuggestions(false), 200)}
                  />
                  {showMandalSuggestions && offlineLoanForm.mandal.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                      {uniqueMandals.filter(m => 
                        m.toLowerCase().includes(offlineLoanForm.mandal.toLowerCase())
                      ).slice(0, 5).map((mnd, index) => (
                        <button
                          key={mnd}
                          type="button"
                          onMouseDown={() => {
                            setOfflineLoanForm(prev => ({ ...prev, mandal: mnd }));
                            setShowMandalSuggestions(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-slate-100 last:border-0 transition-colors ${
                            activeSuggestIndex === index 
                              ? 'bg-blue-600 text-white' 
                              : 'hover:bg-blue-50 text-slate-700'
                          }`}
                        >
                          {mnd}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount and Metal Type side-by-side */}
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Loan Finance Amount * (₹)</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold text-rose-600 animate-pulse"
                    value={offlineLoanForm.amount}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Metal Type</label>
                  <div className="flex items-center gap-4 h-[38px] border border-slate-200 rounded-lg px-3 bg-white">
                    <label className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer text-slate-700">
                      <input type="radio" name="off-metal" checked={offlineLoanMetalType === "Gold"} onChange={() => setOfflineLoanMetalType("Gold")} /> Gold
                    </label>
                    <label className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer text-slate-700">
                      <input type="radio" name="off-metal" checked={offlineLoanMetalType === "Silver"} onChange={() => setOfflineLoanMetalType("Silver")} /> Silver
                    </label>
                  </div>
                </div>

                {/* Dynamic Pledged Items Block */}
                <div className="col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Pledged Items Block</h4>
                  
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {offlineLoanPledgedItems.map((item, idx) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                        {/* Item Name (with autocomplete) */}
                        <div className="col-span-9 relative">
                          <input 
                            type="text" 
                            required
                            placeholder={`Item ${idx + 1}...`}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                            value={item.name}
                            onChange={(e) => handlePledgedItemRowChange(idx, "name", e.target.value, e)}
                            onFocus={() => {
                              setFocusedItemIndex(idx);
                              setShowItemSuggestions(true);
                            }}
                            onBlur={() => setTimeout(() => {
                              if (focusedItemIndex === idx) {
                                setShowItemSuggestions(false);
                              }
                            }, 200)}
                          />
                          {showItemSuggestions && focusedItemIndex === idx && item.name.trim() && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                              {uniqueItemNames.filter(name => 
                                name.toLowerCase().includes(item.name.toLowerCase())
                              ).slice(0, 5).map((suggestedName, sIdx) => (
                                <button
                                  key={suggestedName}
                                  type="button"
                                  onMouseDown={() => handleSelectPledgedItemRowSuggestion(idx, suggestedName)}
                                  className={`w-full text-left px-3 py-2 text-xs font-bold border-b border-slate-100 last:border-0 transition-colors ${
                                    activeSuggestIndex === sIdx 
                                      ? 'bg-blue-600 text-white' 
                                      : 'hover:bg-blue-50 text-slate-700'
                                  }`}
                                >
                                  {suggestedName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Qty */}
                        <div className="col-span-2">
                          <input 
                            type="number" 
                            required
                            placeholder="Qty"
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold text-center"
                            value={item.qty || ""}
                            onChange={(e) => handlePledgedItemRowChange(idx, "qty", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        {/* Delete row button */}
                        <div className="col-span-1 flex justify-center">
                          {offlineLoanPledgedItems.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeOfflineLoanRow(item.id)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    onClick={addOfflineLoanRow}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                  >
                    <PlusCircle size={14} /> + Add Item
                  </button>

                  {/* Weights & Worth details */}
                  <div className="grid grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-200">
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Total Qty</label>
                      <input 
                        type="text" 
                        readOnly
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-slate-100 font-bold text-center text-slate-600"
                        value={offlineLoanPledgedItems.reduce((sum, item) => sum + (item.qty || 0), 0)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Yield/KDM</label>
                      <input 
                        type="text" 
                        placeholder="60%"
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                        value={offlineLoanForm.yield}
                        onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, yield: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Gross Weight (g)</label>
                      <input 
                        type="text" 
                        placeholder="0.00"
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                        value={offlineLoanForm.grossWeight}
                        onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, grossWeight: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Net Wt. (g)</label>
                      <input 
                        type="text" 
                        placeholder="0.00"
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                        value={offlineLoanForm.netWeight}
                        onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, netWeight: e.target.value }))}
                      />
                    </div>
                    <div className="form-group col-span-1">
                      {/* Empty cell or spacer */}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Worth (₹)</label>
                      <input 
                        type="text" 
                        placeholder="Worth/Value in Rupees..."
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                        value={offlineLoanForm.worth}
                        onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, worth: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Remarks</label>
                      <input 
                        type="text" 
                        placeholder="Remarks..."
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                        value={offlineLoanForm.remarks}
                        onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, remarks: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Adjustments Form inside Offline Loan Modal (only when editing) */}
                {editingTxnId && (
                  <div className="col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <PlusCircle size={14} className="text-blue-600" /> Principal Adjustments (Top-up / Repayment)
                    </h4>
                    {/* List existing adjustments */}
                    {offlineLoanForm.topups && offlineLoanForm.topups.length > 0 && (
                      <div className="space-y-1.5 text-xs max-h-28 overflow-y-auto pr-1">
                        {offlineLoanForm.topups.map((top: any, tIdx: number) => {
                          const isRepay = top.extraAmount < 0 || top.type === "repayment";
                          return (
                            <div key={tIdx} className="flex justify-between bg-white border border-slate-200 p-2 rounded-lg font-semibold text-slate-700 shadow-sm">
                              <span>
                                {formatDateToDDMMYYYY(top.date)}:{" "}
                                {isRepay ? (
                                  <strong className="text-emerald-600">Repayment -₹{Math.abs(top.extraAmount).toLocaleString('en-IN')}</strong>
                                ) : (
                                  <strong className="text-blue-600">Top-up +₹{top.extraAmount.toLocaleString('en-IN')}</strong>
                                )}
                              </span>
                              {top.interestAccrued > 0 && <span className="text-rose-600 font-bold ml-2">(Accrued Interest: ₹{top.interestAccrued.toLocaleString('en-IN')})</span>}
                              <span className="text-slate-400 font-normal ml-auto">{top.remarks}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Add Top-up inputs */}
                    <div className="border-t border-slate-200/60 pt-2 grid grid-cols-3 gap-2">
                      <div className="col-span-3 text-[10px] font-bold text-blue-600 mb-0.5 uppercase tracking-wider">Option 1: Add Extra Amount (Top-up)</div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Amount (₹)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 1000"
                          className="w-full border border-slate-200 rounded-lg p-1.5 font-semibold bg-white text-xs outline-none focus:border-blue-500"
                          value={offlineLoanForm.newTopUpAmount || ""}
                          onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, newTopUpAmount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Date Taken</label>
                        <input 
                          type="date" 
                          className="w-full border border-slate-200 rounded-lg p-1.5 font-semibold bg-white text-xs outline-none focus:border-blue-500"
                          value={offlineLoanForm.newTopUpDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, newTopUpDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Remarks</label>
                        <input 
                          type="text" 
                          placeholder="Remarks..."
                          className="w-full border border-slate-200 rounded-lg p-1.5 font-semibold bg-white text-xs outline-none focus:border-blue-500"
                          value={offlineLoanForm.newTopUpRemarks || ""}
                          onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, newTopUpRemarks: e.target.value }))}
                        />
                      </div>
                    </div>
                    {/* Add Repayment inputs */}
                    <div className="border-t border-slate-200/60 pt-2 grid grid-cols-3 gap-2">
                      <div className="col-span-3 text-[10px] font-bold text-emerald-600 mb-0.5 uppercase tracking-wider">Option 2: Pay/Clear Principal (Repayment)</div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Repayment Amount (₹)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 2000"
                          className="w-full border border-slate-200 rounded-lg p-1.5 font-semibold bg-white text-xs outline-none focus:border-emerald-500"
                          value={offlineLoanForm.newRepaymentAmount || ""}
                          onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, newRepaymentAmount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Repayment Date</label>
                        <input 
                          type="date" 
                          className="w-full border border-slate-200 rounded-lg p-1.5 font-semibold bg-white text-xs outline-none focus:border-emerald-500"
                          value={offlineLoanForm.newRepaymentDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, newRepaymentDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Remarks</label>
                        <input 
                          type="text" 
                          placeholder="Remarks..."
                          className="w-full border border-slate-200 rounded-lg p-1.5 font-semibold bg-white text-xs outline-none focus:border-emerald-500"
                          value={offlineLoanForm.newRepaymentRemarks || ""}
                          onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, newRepaymentRemarks: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                )}





                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Interest Rate (Auto per month)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold text-blue-600"
                    value={offlineLoanForm.interestRate.replace("%", "")}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, interestRate: e.target.value + "%" }))}
                  />
                </div>

                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">To be released Date *</label>
                  <input 
                    type="date" 
                    required
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.endDate}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Loan Status</label>
                  <select 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white cursor-pointer font-semibold"
                    value={offlineLoanForm.status}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Cleared">Cleared</option>
                  </select>
                </div>
                {offlineLoanForm.status === "Cleared" && (
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400 block mb-1">Cleared Date *</label>
                    <input 
                      type="date" 
                      required
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                      value={offlineLoanForm.clearedDate || ""}
                      onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, clearedDate: e.target.value }))}
                    />
                  </div>
                )}
                 <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Interest Paid Upto Date</label>
                  <input 
                    type="date" 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                    value={offlineLoanForm.interestPaidUpto}
                    onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, interestPaidUpto: e.target.value }))}
                  />
                </div>
                {offlineLoanForm.interestPaidUpto && offlineLoanForm.interestPaidUpto !== offlineLoanForm.takenDate && (
                  <div className="form-group">
                    <label className="text-xs font-bold text-slate-400 block mb-1">Interest Amount Cleared (₹)</label>
                    <input 
                      type="number" 
                      placeholder="Enter amount cleared..."
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold"
                      value={offlineLoanForm.interestAmountPaid}
                      onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, interestAmountPaid: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="form-group mt-4">
                <label className="text-xs font-bold text-slate-400 block mb-1">Note</label>
                <textarea 
                  placeholder="Add any internal notes or remarks..."
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none bg-white font-semibold min-h-[60px]"
                  value={offlineLoanForm.note}
                  onChange={(e) => setOfflineLoanForm(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowOfflineLoanModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-50 bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT OFFLINE LOANS MODAL */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl p-6 flex flex-col my-8">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-800">📤 Bulk Import Offline Loans</h3>
              <button type="button" onClick={() => setShowBulkImportModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 font-medium">
                <div className="font-bold text-slate-800 mb-1">CSV Field Header Order (Make sure the first line matches this header exactly):</div>
                <code className="block bg-slate-800 text-slate-200 p-2 rounded select-all font-mono font-bold leading-normal break-all">
                  BillNo,CustomerName,Phone,Amount,InterestRate,TakenDate,EndDate,PledgedItems,Status,InterestPaidUpto,Father,IdProof,Address,Mandal,ClearedDate
                </code>
                <div className="mt-2 text-[10px] text-slate-500 leading-relaxed space-y-1">
                  <div>* Note: Use semicolons (<code className="font-mono bg-slate-200 p-0.5 rounded font-bold">;</code>) to separate items inside the <code className="font-bold">PledgedItems</code> field to avoid breaking the CSV columns. Dates must be formatted as <code className="font-bold">YYYY-MM-DD</code>.</div>
                  <div>* <strong>Items Quantity</strong>: To specify item quantities, prefix the name with the quantity, e.g. <code className="font-mono bg-slate-200 p-0.5 rounded font-bold">2x Gold Ring; 1x Gold Chain</code>. It will automatically detect the number!</div>
                  <div>* <strong>Missing values / Optional fields</strong>: If a field has no value (like phone number, father's name, ID proof, mandal, or cleared date), <strong>leave it completely empty between the commas</strong> (for example: <code className="font-mono bg-slate-200 p-0.5 rounded font-bold">101,Rajesh,,15000,...</code>). Do not add spaces or dashes, just keep the column empty.</div>
                  <div>* <strong>Cleared Loans</strong>: If a loan is already cleared/closed, set the <code className="font-bold">Status</code> column to <code className="font-mono bg-slate-200 p-0.5 rounded font-bold">Cleared</code> and put the date it was cleared in the <code className="font-bold">ClearedDate</code> column.</div>
                </div>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Paste CSV Data</label>
                <textarea 
                  rows={8}
                  placeholder={`BillNo,CustomerName,Phone,Amount,InterestRate,TakenDate,EndDate,PledgedItems,Status,InterestPaidUpto,Father,IdProof,Address,Mandal,ClearedDate\n101,Rajesh,9876543210,15000,1.5%,2025-01-10,2026-01-10,2x Gold Ring;1x Gold Chain,Cleared,2025-04-10,,,Chennai,,2025-04-10`}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none bg-white font-mono font-bold"
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                />
              </div>

              {bulkImportProgress && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center mb-1 text-xs font-bold text-blue-700">
                    <span>Importing Rows...</span>
                    <span>{bulkImportProgress.current} / {bulkImportProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden mb-2">
                    <div 
                      className="bg-blue-600 h-2.5 transition-all duration-300" 
                      style={{ width: `${(bulkImportProgress.current / bulkImportProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 font-mono truncate">{bulkImportProgress.status}</div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button" 
                  disabled={bulkImportProgress !== null}
                  onClick={() => setShowBulkImportModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={bulkImportProgress !== null || !bulkCsvText.trim()}
                  onClick={handleBulkImport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload size={14} /> Start Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomer} className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-lg text-slate-800">{customerForm.id ? "Edit Customer Profile" : "Register New Customer"}</h3>
                <button type="button" onClick={() => setShowCustomerModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
                <div className="form-group col-span-2">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Customer Name *</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number *</label>
                  <input 
                    type="tel" 
                    required 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Father's / Husband's Name</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                    value={customerForm.father}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, father: e.target.value }))}
                  />
                </div>
                <div className="form-group col-span-2">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Full Address *</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Ration / Aadhar ID Proof</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                    value={customerForm.idproof}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, idproof: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-slate-400 block mb-1">Mandal</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" 
                    value={customerForm.mandal}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, mandal: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs">Save Profile</button>
            </div>
          </form>
        </div>
      )}

      {/* ADD/EDIT ITEM MODAL */}
      {showItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-lg text-slate-800">{itemForm.id ? "Edit Item Name" : "Add New Item to Catalog"}</h3>
              <button type="button" onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!itemForm.name.trim()) return;
              fetch("/api/v1/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: itemForm.id || undefined,
                  name: itemForm.name.trim(),
                  category: itemForm.category
                })
              }).then(() => {
                setShowItemModal(false);
                refreshData();
              });
            }} className="space-y-4 text-sm font-semibold">
              <div className="form-group">
                <label className="text-xs font-bold text-slate-400 block mb-1">Item Name *</label>
                <input 
                  type="text" 
                  required 
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" 
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="text-xs font-bold text-slate-400 block mb-1">Category *</label>
                <select 
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
                  value={itemForm.category}
                  onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Jewelry">Jewelry</option>
                  <option value="Furniture">Furniture</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setShowItemModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HIDDEN PRINTABLE TICKETS */}
      {activePrintTicket && (
        <div className={`hidden print:block fixed top-0 left-0 bg-white text-black p-0 m-0 z-[9999] ${
          activePrintTicket.variant === "purchase" ? "w-[105mm] h-[148mm]" : "w-full h-full"
        }`}>
          
          {/* Purchase Invoice */}
          {activePrintTicket.variant === "purchase" && (
            <div className="w-full h-full flex flex-col justify-between p-4 border border-blue-955 text-xs leading-normal text-blue-950 bg-white font-sans box-border relative">
              <div>
                {/* Header row 1: Proprietor and phone */}
                <div className="flex justify-between items-center text-[9px] font-bold text-blue-950 pb-1 border-b border-slate-200">
                  <div className="flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                    P. ప్రవీణ్ కుమార్
                  </div>
                  <div className="flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.3 11.3 0 005.455 5.455l.773-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                    సెల్ : 99636 53730
                  </div>
                </div>

                {/* Header Content: Sai Baba Portrait + Title Block */}
                <div className="flex items-center gap-3 mt-2 mb-1">
                  {/* Sai Baba Portrait */}
                  <div className="w-16 h-16 rounded-full border border-slate-350 overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-50">
                    <img src="/saibaba.png" alt="Shirdi Sai Baba" className="w-full h-full object-cover" />
                  </div>

                  {/* Title details */}
                  <div className="flex-1 flex flex-col items-center">
                    {/* Estimation center title with ornaments */}
                    <div className="flex flex-col items-center my-0.5">
                      <svg className="w-16 h-1 text-[#b89550]" fill="currentColor" viewBox="0 0 100 10"><path d="M10 5h80M50 0l5 5-5 5-5-5z"></path></svg>
                      <div className="text-[11px] font-extrabold tracking-widest text-blue-950">ESTIMATION</div>
                      <svg className="w-16 h-1 text-[#b89550]" fill="currentColor" viewBox="0 0 100 10"><path d="M10 5h80M50 0l5 5-5 5-5-5z"></path></svg>
                    </div>

                    {/* Shop Name */}
                    <div className="text-center font-black text-[14.5px] text-blue-950 tracking-wide">
                      సాయి బాలాజీ జ్యుయలరీ & ఫర్నిచర్
                    </div>

                    {/* Address */}
                    <div className="flex justify-center items-center text-[8px] font-bold text-blue-900 mt-0.5">
                      <svg className="w-2.5 h-2.5 mr-0.5 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                      గాంధీ బొమ్మ సెంటర్, శ్రీ కృష్ణ కాంప్లెక్స్, బుద్ధవరం బస్టాఫ్ ఎదురుగా, గన్నవరం
                    </div>
                  </div>
                </div>

                {/* Gold horizontal border */}
                <div className="border-t border-[#b89550] my-2"></div>

                {/* Customer Details Box */}
                <div className="border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] bg-slate-50/50 mb-3">
                  <div className="flex flex-col justify-center">
                    <span className="text-slate-500 font-bold text-[8.5px] uppercase tracking-wider flex items-center">
                      <svg className="w-3 h-3 mr-1 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                      Customer Name :
                    </span>
                    <span className="font-extrabold text-[12px] text-blue-950 mt-0.5">Sri: {activePrintTicket.customer.name}</span>
                  </div>
                  <div className="flex flex-col justify-center border-l border-slate-200 pl-4">
                    <span className="text-slate-500 font-bold text-[8.5px] uppercase tracking-wider flex items-center">
                      <svg className="w-3 h-3 mr-1 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>
                      Bill No. :
                    </span>
                    <span className="font-black text-[12px] text-blue-950 mt-0.5">#{formatBillNoForDisplay(activePrintTicket.txn.id)}</span>
                  </div>
                  <div className="flex flex-col justify-center border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-bold text-[8.5px] uppercase tracking-wider flex items-center">
                      <svg className="w-3 h-3 mr-1 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.3 11.3 0 005.455 5.455l.773-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                      Phone :
                    </span>
                    <span className="font-bold text-blue-950 mt-0.5">{activePrintTicket.customer.phone}</span>
                  </div>
                  <div className="flex flex-col justify-center border-l border-slate-200 pl-4 border-t border-slate-100 pt-2">
                    <span className="text-slate-500 font-bold text-[8.5px] uppercase tracking-wider flex items-center">
                      <svg className="w-3 h-3 mr-1 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path></svg>
                      Date :
                    </span>
                    <span className="font-bold text-blue-950 mt-0.5">{formatDateToDDMMYYYY(activePrintTicket.txn.date)}</span>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left border border-slate-300 border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-[#002f5d] text-white text-center font-bold">
                      <th className="p-2 border-r border-[#002f5d] w-12 text-center">క్ర.సం.<br/><span className="text-[7.5px] font-normal uppercase">No.</span></th>
                      <th className="p-2 border-r border-[#002f5d] text-left">వివరం (Particulars)</th>
                      {activePrintTicket.txn.category === "Jewelry" ? (
                        <>
                          <th className="p-2 border-r border-[#002f5d] w-14">గ్రా॥<br/><span className="text-[7.5px] font-normal uppercase">Grams</span></th>
                          <th className="p-2 border-r border-[#002f5d] w-14">మి. గ్రా॥<br/><span className="text-[7.5px] font-normal uppercase">Mg</span></th>
                        </>
                      ) : (
                        <th className="p-2 border-r border-[#002f5d] w-20">పరిమాణం<br/><span className="text-[7.5px] font-normal uppercase">(Qty)</span></th>
                      )}
                      <th className="p-2 w-28 text-right">మొత్తం (₹)<br/><span className="text-[7.5px] font-normal uppercase">Amount</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePrintTicket.txn.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-200 text-center font-semibold text-blue-950">
                        <td className="p-2 border-r border-slate-200">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 text-left font-bold">{item.particulars}</td>
                        {activePrintTicket.txn.category === "Jewelry" ? (
                          <>
                            <td className="p-2 border-r border-slate-200">{item.grams || "-"}</td>
                            <td className="p-2 border-r border-slate-200">{item.mg || "-"}</td>
                          </>
                        ) : (
                          <td className="p-2 border-r border-slate-200">{item.qty}</td>
                        )}
                        <td className="p-2 text-right font-bold">{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    {/* Empty padding rows to lock notebook design size */}
                    {Array.from({ length: Math.max(0, 4 - activePrintTicket.txn.items.length) }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="border-b border-slate-100 h-8">
                        <td className="p-2 border-r border-slate-200"></td>
                        <td className="p-2 border-r border-slate-200"></td>
                        {activePrintTicket.txn.category === "Jewelry" ? (
                          <>
                            <td className="p-2 border-r border-slate-200"></td>
                            <td className="p-2 border-r border-slate-200"></td>
                          </>
                        ) : (
                          <td className="p-2 border-r border-slate-200"></td>
                        )}
                        <td className="p-2"></td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="font-extrabold border-t border-slate-300">
                      <td colSpan={activePrintTicket.txn.category === "Jewelry" ? 4 : 3} className="p-2 text-right text-[#002f5d] tracking-wide text-xs uppercase bg-slate-100">TOTAL</td>
                      <td className="p-2 text-right bg-[#002f5d] text-white text-[12px] font-black">₹{activePrintTicket.txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Notice & Signature Block */}
              <div className="space-y-3">
                {/* Gold border notice box */}
                <div className="border border-[#b89550] rounded-lg p-2 bg-[#fdfaf2] text-center text-[9px] font-extrabold text-blue-950 flex items-center justify-center gap-1.5 shadow-sm">
                  <svg className="w-4 h-4 text-[#b89550]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
                  {activePrintTicket.txn.category === "Jewelry" 
                    ? "అన్ని రకాల బంగారు ఆభరణములు ఆర్డర్లపై తగిన ధరలు చేయబడును."
                    : "అన్ని రకాల ఫర్నిచర్ ఆర్డర్లపై తగ్గిన ధరలు చేయబడును."}
                </div>

                {/* Footer floral line */}
                <div className="flex items-center justify-center text-[10px] text-[#b89550] gap-1 font-bold">
                  <span>✿</span>
                  <span className="border-t border-dashed border-[#b89550] w-24"></span>
                  <span className="text-blue-950 font-black px-1 text-[11px]">ధన్యవాదాలు!</span>
                  <span className="border-t border-dashed border-[#b89550] w-24"></span>
                  <span>✿</span>
                </div>

                <div className="text-center font-bold text-[9px] text-slate-500 uppercase tracking-widest pt-1">
                  సంతకం
                </div>
              </div>
            </div>
          )}

          {/* Loan Pawn Slips */}
          {activePrintTicket.variant === "loan" && (
            <div className="space-y-6">
              {/* Green/Yellowish Slip - Shop Copy (A5 Portrait) */}
              <div className="w-[148mm] h-[210mm] flex flex-col justify-between p-5 border border-blue-900 bg-yellow-50/10 text-[10px] leading-relaxed text-blue-950 font-sans box-border page-break-after">
                <div>
                  {/* Header */}
                  <div className="text-center border-b border-blue-900 pb-2">
                    <h2 className="text-[18px] font-black text-blue-900 tracking-wider">ప్రవీణ్ కుమార్ ఫైనాన్స్</h2>
                    <div className="flex justify-between items-center text-[10px] font-bold mt-1 px-4">
                      <div>ప్రొ॥ పల్లపోతు ప్రవీణ్ కుమార్</div>
                      <div>పాన్ బ్రోకర్ లైసెన్సు నెం. 13/16</div>
                    </div>
                    <div className="text-[10px] font-bold text-center mt-0.5">
                      గన్నవరం - 521101. (కృష్ణా జిల్లా) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; సెక్షన్ 7 &amp; రూలు 8
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between font-bold">
                      <div>వరుస నెం: <span className="underline ml-1">#{formatBillNoForDisplay(activePrintTicket.txn.id)}</span></div>
                      <div>తేది: <span className="underline">{formatDateToDDMMYYYY(activePrintTicket.txn.loanDetails.takenDate)}</span></div>
                    </div>

                    <div className="border-b border-dotted border-blue-400 pb-0.5">
                      తాకట్టు పెట్టిన వారి పేరు: <span className="font-extrabold ml-1">{activePrintTicket.customer.name}</span>
                    </div>

                    <div className="border-b border-dotted border-blue-400 pb-0.5">
                      తండ్రి / భర్త: <span className="font-extrabold ml-1">{activePrintTicket.txn.loanDetails.father}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-b border-dotted border-blue-400 pb-0.5">
                        రేషన్ / ఆధార్ / ఓటర్ కార్డ్ నెం: <span className="font-bold ml-1">{activePrintTicket.txn.loanDetails.idProof}</span>
                      </div>
                      <div className="border-b border-dotted border-blue-400 pb-0.5">
                        ఫోన్: <span className="font-bold ml-1">{activePrintTicket.customer.phone}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-b border-dotted border-blue-400 pb-0.5">
                        అడ్రసు: <span className="font-semibold ml-1">{activePrintTicket.customer.address}</span>
                      </div>
                      <div className="border-b border-dotted border-blue-400 pb-0.5">
                        పోస్టు: <span className="font-semibold ml-1">{activePrintTicket.customer.mandal || "Gannavaram"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="border-b border-dotted border-blue-400 pb-0.5">
                        మండలం: <span className="font-semibold ml-1">{activePrintTicket.customer.mandal || "Gannavaram"}</span>
                      </div>
                      <div className="border-b border-dotted border-blue-400 pb-0.5">
                        జిల్లా: <span className="font-semibold ml-1">కృష్ణా</span>
                      </div>
                      <div className="border-b border-dotted border-blue-400 pb-0.5">
                        పేట: <span className="font-semibold ml-1">Bazar</span>
                      </div>
                    </div>

                    <div className="text-center font-bold text-[11px] py-1 text-blue-900">
                      వ్యాపారం / కుటుంబ ఖర్చుల నిమిత్తం తాకట్టు పై
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex-1 border-b border-dotted border-blue-400 pb-0.5">
                        తీసుకున్న మొత్తం: <span className="font-extrabold ml-1">₹{activePrintTicket.txn.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-40 border-b border-dotted border-blue-400 text-right pb-0.5">
                        రూ: <span className="font-extrabold">{activePrintTicket.txn.amount}/-</span>
                      </div>
                    </div>

                    <div className="border-b border-dotted border-blue-400 pb-0.5">
                      అక్షరాల రూ: <span className="font-semibold ml-1">Rupees {activePrintTicket.txn.amount.toLocaleString('en-IN')} Only</span>
                    </div>

                    <div className="flex justify-between font-bold text-blue-900 text-[10px]">
                      <div>వడ్డీరేటు : {activePrintTicket.txn.loanDetails.interestRate} చట్టప్రకారం</div>
                      <div>: తాకట్టు పెట్టిన వస్తువు వివరం</div>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left border border-blue-950 border-collapse text-[9px] mt-2">
                    <thead>
                      <tr className="bg-slate-100 border-b border-blue-950 font-bold text-center">
                        <th className="p-1 border-r border-blue-950 w-10">శాలీల సంఖ్య</th>
                        <th className="p-1 border-r border-blue-950 text-left">శాలీల పేర్లు</th>
                        <th className="p-1 border-r border-blue-950 w-12">దిగుబడి</th>
                        <th className="p-1 border-r border-blue-950 w-16">నిలువ తూకం G.M.G.</th>
                        <th className="p-1 border-r border-blue-950 w-16">నికరం తూకం G.M.G.</th>
                        <th className="p-1 border-r border-blue-950 w-16">విలువ రూ.</th>
                        <th className="p-1">రిమార్కులు</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePrintTicket.txn.loanDetails.items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-blue-200 text-center">
                          <td className="p-1 border-r border-blue-950 font-semibold">{item.qty}</td>
                          <td className="p-1 border-r border-blue-950 text-left font-semibold">{item.name}</td>
                          <td className="p-1 border-r border-blue-950 font-semibold">{item.yield || "-"}</td>
                          <td className="p-1 border-r border-blue-950 font-semibold">{item.grossWeight}g</td>
                          <td className="p-1 border-r border-blue-950 font-semibold">{item.netWeight}g</td>
                          <td className="p-1 border-r border-blue-950 font-semibold">₹{item.value?.toLocaleString('en-IN') || "-"}</td>
                          <td className="p-1 font-semibold">{item.remarks || "-"}</td>
                        </tr>
                      ))}
                      {/* Fill empty space */}
                      {Array.from({ length: Math.max(0, 4 - activePrintTicket.txn.loanDetails.items.length) }).map((_, idx) => (
                        <tr key={`empty-loan-${idx}`} className="border-b border-blue-200 h-5">
                          <td className="p-1 border-r border-blue-950"></td>
                          <td className="p-1 border-r border-blue-950"></td>
                          <td className="p-1 border-r border-blue-950"></td>
                          <td className="p-1 border-r border-blue-950"></td>
                          <td className="p-1 border-r border-blue-950"></td>
                          <td className="p-1 border-r border-blue-950"></td>
                          <td className="p-1"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-2 border-t border-blue-300">
                  <div className="flex justify-between text-[8px] font-bold text-blue-900 mb-4">
                    <div>తాకట్టు పెట్టిన వస్తువులు విడిపించుకొనుటకు నిర్ణీత కాలము : 1 Year</div>
                    <div>ఈ ఫారం వెనుక నున్న షరతులు చదువుకొని/ చదివించుకొని అంగీకరించు కొనడమైనది.</div>
                  </div>

                  <div className="flex justify-between items-end">
                    <div className="border-2 border-double border-blue-900 p-2 text-center font-black text-sm text-blue-900 bg-slate-50 w-36">
                      రూ. {activePrintTicket.txn.amount.toLocaleString('en-IN')}/-
                    </div>
                    <div className="text-right pb-1">
                      <p className="font-bold text-[9px] border-t border-blue-300 pt-1 w-48 text-center">తాకట్టుపెట్టిన వారి సంతకం లేక వేలిముద్ర</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pink Slip - Customer Copy (A6 Landscape) */}
              <div className="w-[148mm] h-[105mm] flex flex-col justify-between p-4 border border-pink-500 bg-pink-50/10 text-[9.5px] leading-tight text-pink-950 font-sans box-border">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2 border-b border-pink-400 pb-1">
                    <div className="text-[8px] font-bold">ప్రొ॥ పల్లపోతు ప్రవీణ్ కుమార్</div>
                    <div className="text-center flex-1">
                      <h2 className="text-[15px] font-black text-pink-800">ప్రవీణ్ కుమార్ ఫైనాన్స్</h2>
                      <div className="text-[9px] font-extrabold">గన్నవరం</div>
                    </div>
                    <div className="text-[8px] font-bold text-right">సెల్. 9963653730</div>
                  </div>

                  {/* Info fields */}
                  <div className="space-y-1.5 font-semibold">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 border-b border-dotted border-pink-400">
                        బి.నెం: <span className="font-bold ml-1">#{formatBillNoForDisplay(activePrintTicket.txn.id)}</span>
                      </div>
                      <div className="w-36 text-right border-b border-dotted border-pink-400">
                        తేది: <span className="font-bold">{formatDateToDDMMYYYY(activePrintTicket.txn.loanDetails.takenDate)}</span>
                      </div>
                    </div>

                    <div className="text-right border-b border-dotted border-pink-400">
                      తూకం: <span className="font-bold">{activePrintTicket.txn.loanDetails.items.reduce((s: number, i: any) => s + (i.grossWeight * i.qty), 0).toFixed(2)} g</span>
                    </div>

                    <div className="border-b border-dotted border-pink-400 pb-0.5">
                      ఆసామి పేరు: <span className="font-extrabold text-pink-900 ml-1">{activePrintTicket.customer.name}</span>
                    </div>

                    <div className="border-b border-dotted border-pink-400 pb-0.5">
                      వస్తువు పేరు: <span className="font-extrabold text-pink-900 ml-1">{activePrintTicket.txn.loanDetails.items.map((i: any) => `${i.qty}x ${i.name}`).join(', ')}</span>
                    </div>

                    <div className="border-b border-dotted border-pink-400 pb-0.5">
                      గ్రామము: <span className="font-semibold ml-1">{activePrintTicket.customer.address}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <div className="flex-1 border-b border-dotted border-pink-400">
                        రూ: <span className="font-black text-pink-800 text-[11px] ml-1">{activePrintTicket.txn.amount.toLocaleString('en-IN')}/-</span>
                      </div>
                      <div className="w-48 text-right border-b border-dotted border-pink-400">
                        గడువు పూర్తి తేది: <span className="font-bold">{formatDateToDDMMYYYY(activePrintTicket.txn.loanDetails.endDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end pt-2 border-t border-pink-300">
                  <p className="font-bold text-[9px] border-t border-pink-400 pt-1 w-44 text-center">వస్తువు విడిపించిన వారి సంతకం</p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t flex justify-around p-1 z-40 md:hidden print:hidden ${theme === "dark" ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-600"}`}>
        <button 
          onClick={() => setActiveTab("dashboard")} 
          className={`flex flex-col items-center p-1.5 text-[9px] font-bold ${activeTab === "dashboard" ? "text-blue-500" : "text-slate-400"}`}
        >
          <LayoutDashboard size={18} />
          <span className="mt-0.5">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab("billing")} 
          className={`flex flex-col items-center p-1.5 text-[9px] font-bold ${activeTab === "billing" ? "text-blue-500" : "text-slate-400"}`}
        >
          <PlusCircle size={18} />
          <span className="mt-0.5">Billing</span>
        </button>
        <button 
          onClick={() => setActiveTab("customers")} 
          className={`flex flex-col items-center p-1.5 text-[9px] font-bold ${activeTab === "customers" ? "text-blue-500" : "text-slate-400"}`}
        >
          <Users size={18} />
          <span className="mt-0.5">Customers</span>
        </button>
        <button 
          onClick={() => setActiveTab("loan-history")} 
          className={`flex flex-col items-center p-1.5 text-[9px] font-bold ${activeTab === "loan-history" ? "text-blue-500" : "text-slate-400"}`}
        >
          <History size={18} />
          <span className="mt-0.5">Loans</span>
        </button>
        <button 
          onClick={() => setActiveTab("sms-queue")} 
          className={`flex flex-col items-center p-1.5 text-[9px] font-bold ${activeTab === "sms-queue" ? "text-blue-500" : "text-slate-400"}`}
        >
          <MessageSquare size={18} />
          <span className="mt-0.5">SMS</span>
        </button>
        <button 
          onClick={() => setActiveTab("settings")} 
          className={`flex flex-col items-center p-1.5 text-[9px] font-bold ${activeTab === "settings" ? "text-blue-500" : "text-slate-400"}`}
        >
          <Settings size={18} />
          <span className="mt-0.5">Settings</span>
        </button>
      </nav>

    </div>
  );
}
