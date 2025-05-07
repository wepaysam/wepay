
import { 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  FileText, 
  Gift 
} from "lucide-react";

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  route: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  accountNo: string;
  ifscCode: string;
  verified: boolean;
  amount?: string;
}

export interface Transaction {
  id: string;
  txnId: string;
  receiverName: string;
  amount: string;
  charge: string;
  totalAmount: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  date: string;
  time: string;
  bank: string;
  branch: string;
  accountNo: string;
  transferType: string;
  utr: string;
}

export const services: Service[] = [
  {
    id: "payout",
    title: "Payout",
    description: "Send money to your beneficiaries instantly",
    icon: DollarSign,
    color: "primary",
    route: "/payouts"
  },
  {
    id: "recharge",
    title: "Recharge",
    description: "Mobile, DTH, and other utility recharges",
    icon: Smartphone,
    color: "info",
    route: "/recharge"
  },
  {
    id: "bill-payment",
    title: "Bill Payment",
    description: "Pay your utility and other bills",
    icon: FileText,
    color: "success",
    route: "/bill-payment"
  },
  {
    id: "gift-cards",
    title: "Gift Cards",
    description: "Buy and send gift cards to your loved ones",
    icon: Gift,
    color: "destructive",
    route: "/gift-cards"
  },
  {
    id: "credit-card",
    title: "Credit Card",
    description: "Pay your credit card bills",
    icon: CreditCard,
    color: "info",
    route: "/credit-card"
  }
];

export const beneficiaries: Beneficiary[] = [
  {
    id: "1",
    name: "Maninder",
    accountNo: "50100352745561",
    ifscCode: "HDFC0000734",
    verified: true,
  },
  {
    id: "2",
    name: "Dipak Majumdar",
    accountNo: "40773576452",
    ifscCode: "SBIN0013549",
    verified: true,
  },
  {
    id: "3",
    name: "Nupur Singh",
    accountNo: "110139934909",
    ifscCode: "CNRB0002992",
    verified: true,
  },
  {
    id: "4",
    name: "Dharmender",
    accountNo: "30770010720323",
    ifscCode: "PUNB0039900",
    verified: true,
  },
  {
    id: "5",
    name: "Rishi Anand",
    accountNo: "029213000397",
    ifscCode: "HDFC0000734",
    verified: true,
  }
];

export const transactions: Transaction[] = [
  {
    id: "1",
    txnId: "TXN60748832",
    receiverName: "Maninder",
    amount: "₹29,600.00",
    charge: "₹23.60",
    totalAmount: "₹29,623.60",
    status: "SUCCESS",
    date: "18 Mar, 2023",
    time: "10:50:44 PM",
    bank: "Union Bank of India",
    branch: "GANDHIDHAM(KFT2)",
    accountNo: "623302010016659",
    transferType: "IMPS",
    utr: "TXN60748832"
  },
  {
    id: "2",
    txnId: "TXN60748831",
    receiverName: "Maninder",
    amount: "₹12,500.00",
    charge: "₹23.60",
    totalAmount: "₹12,523.60",
    status: "SUCCESS",
    date: "18 Mar, 2023",
    time: "10:19:58 PM",
    bank: "HDFC Bank",
    branch: "-",
    accountNo: "50100352745561",
    transferType: "IMPS",
    utr: "TXN60748831"
  },
  {
    id: "3",
    txnId: "TXN60748830",
    receiverName: "DIPAK MAJUMDAR",
    amount: "₹5,000.00",
    charge: "₹23.60",
    totalAmount: "₹5,023.60",
    status: "SUCCESS",
    date: "18 Mar, 2023",
    time: "10:18:42 PM",
    bank: "STATE BANK OF INDIA - SBI",
    branch: "-",
    accountNo: "40773576452",
    transferType: "IMPS",
    utr: "TXN60748830"
  },
  {
    id: "4",
    txnId: "TXN60748829",
    receiverName: "Debojit Halder",
    amount: "₹29,500.00",
    charge: "₹23.60",
    totalAmount: "₹29,623.60",
    status: "SUCCESS",
    date: "18 Mar, 2023",
    time: "10:17:06 PM",
    bank: "Punjab National Bank",
    branch: "-",
    accountNo: "144900010402867",
    transferType: "IMPS",
    utr: "TXN60748829"
  },
  {
    id: "5",
    txnId: "TXN60748828",
    receiverName: "RAHUL KUMAR SINGH",
    amount: "₹14,200.00",
    charge: "₹23.60",
    totalAmount: "₹14,223.60",
    status: "SUCCESS",
    date: "18 Mar, 2023",
    time: "10:15:35 PM",
    bank: "HDFC Bank",
    branch: "-",
    accountNo: "50100307557147",
    transferType: "IMPS",
    utr: "TXN60748828"
  }
];
