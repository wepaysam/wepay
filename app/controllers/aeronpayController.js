import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal for calculations
import { se } from 'date-fns/locale';

const cardTypes = {
  CRDVSA: "Visa Card",
  CRDMST: "Master Card",
  CRDRUPAY: "Rupay Card",
  CRDAMX: "American Express",
  CRDDC: "Diners Club Card"
};


export const upiPayment = async (req) => {
//   const requestId = crypto.randomUUID();
    const requestId = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
//   console.log(`[${requestId}] AeronPay UPI payout request received.`);

  try {
    const { amount: rawAmount, beneficiary, websiteUrl, utr } = await req.json();
    const userId =  req.user.id ;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { upiPermissions: true ,balance:true} });

    if (!user) {
      console.error(`[${requestId}] CRITICAL: Authenticated UserID: ${userId} not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const existingTransaction = await prisma.transactions.findFirst({
        where: {
            transactionId: utr,
        },
    });

    if (existingTransaction) {
        return NextResponse.json({ message: 'Transaction ID already exists' }, { status: 400 });
    }

    const amount = new Decimal(rawAmount);

    if(user?.balance < parseInt(amount)){
        console.log("your balance is",user?.balance);
      return NextResponse.json({ message: `Insufficient Balance ${user.balance}` }, { status: 403 });
    }

    

    // console.log("akash asmple",user);
    // Check if user has UPI Aeronpay permission
    if (!user.upiPermissions?.enabled || !user.upiPermissions?.aeronpay) {
        console.log("akash asmple",user.upiPermissions);
      console.warn(`[${requestId}] User ${userId} does not have UPI Aeronpay permission.`);
      return NextResponse.json({ message: 'You do not have permission to perform UPI Aeronpay transactions.' }, { status: 403 });
    }
    // if (!upiBeneficiary) {
    //   console.warn(`[${requestId}] UPI Beneficiary with ID: ${beneficiary.id} not found.`);
    //   return NextResponse.json({ message: 'UPI Beneficiary not found' }, { status: 404 });
    // }
    
    // --- Step 2: Calculate Transaction Charges (Placeholder for UPI specific charges) ---
    // (Your existing charge calculation logic remains commented out)

    // --- Step 3: Validate User Balance ---
    // (Your existing balance validation logic remains commented out)

    // --- Step 4: Call External AeronPay UPI Payout API ---
    const payload = {
        bankProfileId:"1",
        transferMode:"upi",
        accountNumber:"9001770984",
        amount: amount.toNumber(), // Convert Decimal to number for API
        client_referenceId: requestId,
        remarks: 'UPI Payout',
        beneDetails:{
            vpa: beneficiary.upiId,
            name: beneficiary?.accountHolderName,
            email: 'support@wepayx.com',
            phone: '9001770984',
            address1: "Mumbai"
        },
        latitude: '20.1236',
        longitude: '78.1228',
        websiteUrl: websiteUrl,
        transactionId: utr,
    };

    console.log(`[${requestId}] Sending payload to AeronPay UPI:`, JSON.stringify(payload, null, 2));
    
    const response = await fetch( 'https://api.aeronpay.in/api/serviceapi-prod/api/payout/upi', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'client-id': process.env.AERONPAY_CLIENT_ID ,
            'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
        },
        body: JSON.stringify(payload),
    });
    const payoutResult = await response.json();

    console.log(`[${requestId}] AeronPay UPI API response received. Status: ${response.status}, Body:`, payoutResult);

    // --- Step 5: Process API Response ---
    // *** MODIFIED SUCCESS CONDITION HERE ***
    // We now check if AeronPay's *internal* statusCode is 200 or 201 AND their *internal* status is SUCCESS or PENDING.
    // We also make sure the HTTP response status from AeronPay is generally successful (2xx range).
    if ( response.ok && (payoutResult.statusCode === 200 || payoutResult.statusCode === '201') && (payoutResult.status === 'SUCCESS' || payoutResult.status === 'PENDING') ) {
      // SUCCESS/PENDING PATH: Record the transaction with the correct status
      console.log(`[${requestId}] AeronPay UPI reported SUCCESS or PENDING. Starting database transaction.`);
      
      const transactionStatus = payoutResult.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING';

      await prisma.$transaction(async (tx) => {
        // if(payoutResult.status === 'SUCCESS'){
        //   await tx.user.update({
        //   where: { id: userId },
        //   data: { balance: { decrement: totalDebitAmount } },
        // });
        // }
        await tx.transactions.create({
          data: {
            upiBeneficiary: { connect: { id: beneficiary.id } },
            sender:{ connect: { id: userId } },
            amount: amount,
            chargesAmount: 0,
            transactionType: 'UPI',
            transactionStatus: transactionStatus, // Set to PENDING or SUCCESS based on payoutResult.status
            senderAccount: beneficiary.upiId,
            transaction_no: payoutResult.data?.transactionId,
            referenceNo: requestId,
            websiteUrl: websiteUrl,
            transactionId: utr, // Use AeronPay // Use payoutResult.data.utr or transactionId
            gateway: 'AeronPay',
          },
        });
      });
      console.log(`[${requestId}] Database transaction completed successfully with status: ${transactionStatus}.`);
      
      // Return the AeronPay response directly to the frontend, which will have the PENDING status and message
      return NextResponse.json(payoutResult);
    }
    
    // FAILURE PATH: Record the failed attempt, but DO NOT update balance
    console.warn(`[${requestId}] AeronPay UPI payout failed or an unexpected status was returned.`);
    await prisma.transactions.create({
      data: {
        upiBeneficiary: { connect: { id: beneficiary.id } },
        sender:{ connect: { id: userId } },
        amount: amount,
        chargesAmount: 0,
        transactionType: 'UPI',
        transactionStatus: 'FAILED',
        senderAccount: beneficiary.upiId,
        transaction_no: payoutResult.data?.transactionId || requestId, // Use payoutResult.data.transactionId if available
        utr: payoutResult.data?.utr || payoutResult.data?.transactionId || 'N/A',
        gateway: 'AeronPay',
      },
    });
    console.log(`[${requestId}] Logged FAILED AeronPay UPI transaction.`);

    const errorMessage =  payoutResult.message || 'The UPI payment was rejected by AeronPay.';
    
    return NextResponse.json(
      { message: errorMessage, ...payoutResult }, 
      { status: response.status >= 400 ? response.status : 400 }
    );

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN AERONPAY UPI PAYOUT HANDLER ---`, error);
    
    if (error.name === 'AbortError') {
        return NextResponse.json({ message: 'Request timed out.' }, { status: 408 });
    }
    if (error instanceof TypeError) {
        return NextResponse.json({ message: 'A network error occurred. Please try again.' }, { status: 503 });
    }
    if (Decimal.isDecimal(error)) {
        return NextResponse.json({ message: 'A decimal-related processing error occurred.' }, { status: 500 });
    }

    // In case of an unhandled error, we try to create a FAILED transaction.
    // We need to be careful here as upiBeneficiary might not be defined if the error happened early.
    // let upiBeneficiaryIdForError = null;
    // try {
    //     const { beneficiary } = await req.json(); // Re-parse to get beneficiary if available
    //     upiBeneficiaryIdForError = beneficiary?.id;
    // } catch (parseError) {
    //     // If parsing fails, beneficiaryId will remain null
    // }

    await prisma.transactions.create({
        data: { 
            // Only connect if upiBeneficiaryIdForError is valid
            upiBeneficiary: { connect: { id: upiBeneficiaryIdForError } },
            amount: new Decimal(0), // Can't reliably get amount if error is early
            chargesAmount: new Decimal(0), 
            transactionType: 'UPI', 
            transactionStatus: 'FAILED',
            sender: { connect: { id: userId } },
            transaction_no: requestId,
            utr: 'N/A',
            gateway: 'AeronPay',
        }
    });

    const errorMessage = error.message || 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
};
export const checkStatus = async (req, res) => {
    const { unique_id, id } = await req.json();
    console.log("AeronPay checkStatus request received:", { unique_id, id });

    try {
        const payload = {
            client_referenceId: unique_id,
            mobile:"9001770984"
        };
        console.log('payload',payload)
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/reports/transactionStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronPay API response:", data);

        if (response.ok) {
             await prisma.transactions.update({
                where: {
                    id: id
                },
                data: {
                    transactionStatus: data.status === 'SUCCESS' ? 'COMPLETED' : data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                    utr: data.utr 
                }
            });
            return NextResponse.json(data, { status: 200 });
        } else {
            console.error("AeronPay API error:", data);
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in AeronPay checkStatus:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayBalance = async (req, res) => {

    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/balance/check_balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                client_referenceId: Date.now().toString(),
                accountNumber:"9001770984",
                account_type:"Merchant",
                merchant_id:"97009362986"
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayUPIVerification = async (req, res) => {
    const { vpa} = await req.json();
    // console.log("AeronpayUPIVerification request received:", { vpa });

    // Mocked response for testing
    // const mockResponse = {
    //     status: "success",
    //     statusCode: "101",
    //     partner_id: "ARNPY84XXXXXXX",
    //     name: "Mock User",
    //     description: "VPA verification successful (simulated)",
    //     accountExists: "YES",
    //     clientData: {
    //         client_id: "942wq52xdx82"
    //     }
    // };

    // return NextResponse.json(mockResponse, { status: 200 });
    const requestId = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

    
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/verification/upiverify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                vpa,
                clientData:{
                    client_id: requestId,
                }
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayUPIVerification response:", data);

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            console.error("AeronpayUPIVerification error response:", data);
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in AeronpayUPIVerification:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
    
};

export const AeronpayGSTVerification = async (req, res) => {
    const { id_number} = await req.json();
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/verification/upiverify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                id_number,
                filing_status:true,
                client_referenceId: Date.now().toString(),
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};


export const AeronpayMobileOperatorFetch = async (req, res) => {
    const { mobile} = await req.json();

    const requestId = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/verification/mobile_operator`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                mobile,
                clientData:{
                    client_id: requestId,
                }
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayMobileOperatorFetch response:", data);
        // sample output
        // {
        //     "status": "success",
        //     "status-code": "101",
        //     "customer_mobile": "6633663399",
        //     "operator_name": "Jio",
        //     "operator_circle": "Rajasthan",
        //     "postpaid_status": false,
        //     "operator_status": "",
        //     "mnp_status": null,
        //     "partner_id": "ARNPY17385967753735",
        //     "clientData": {
        //     "client_id": "APAY1738596774RAVn6T3GDZ"
        //     }
        // }

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayMobilePlanFetch = async (req, res) => {
    const { mobile} = await req.json();
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/utility/recharge/plan_fetch/operator_code={operator_name}/circle_id={circle_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                mobile,
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayMobilePlanFetch response:", data);
        // sample output
        // {
        //     "status": "success",
        //     "status-code": "101",
        //     "customer_mobile": "6633663399",
        //     "operator_name": "Jio",
        //     "operator_circle": "Rajasthan",
        //     "postpaid_status": false,
        //     "operator_status": "",
        //     "mnp_status": null,
        //     "partner_id": "ARNPY17385967753735",
        //     "clientData": {
        //     "client_id": "APAY1738596774RAVn6T3GDZ"
        //     }
        // }

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpaycreditcardVerification = async (req, res) => {
    const { cardNumber ,name,mobile} = await req.json();
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/utility/ccpayment/creditcard_fetch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                phone:mobile,
                cardNumber,
                name,
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpaycreditcardVerification response:", data);

        if (response.ok) {
            if (data.cardType !== 'credit') {
                return NextResponse.json({ message: 'Please use a credit card.' }, { status: 400 });
            }
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayCreditPayment = async (req, res) => {
    const { mobile,cardNumber,name,email,amount,cardNetwork} = await req.json();
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/utility/ccpayment/creditcard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                mobile,
                cardNumber,
                name,
                email,
                amount,
                cardNetwork
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayCreditPayment response:", data);
                // sample output
                // {
                //     "status": "SUCCESS",
                //     "statusCode": "200",
                //     "message": "Transaction Successful",
                //     "data": {
                //         "transactionId": "ARN4XXXXXXX95584",
                //         "opr_referenceId": "32351XXXX245",
                //         "client_referenceId": "{Unique Reference ID}",
                //         "acknowledged": "1"
                //     }
                // }

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};