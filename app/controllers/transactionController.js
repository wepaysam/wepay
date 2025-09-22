import prisma from '../lib/prisma';

export async function createTransaction(data, userId) {
  try {
    // Start a transaction to ensure atomicity
    return await prisma.$transaction(async (prisma) => {
      // Check if beneficiary exists and is verified
      const beneficiary = await prisma.beneficiary.findFirst({
        where: {
          id: data.beneficiaryId,
          userId,
        },
      });

      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      if (!beneficiary.isVerified) {
        throw new Error('Beneficiary is not verified');
      }

      // Check if user has sufficient balance
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (parseFloat(user.balance) < parseFloat(data.amount)) {
        throw new Error('Insufficient balance');
      }

      // Get transaction charge
      const charge = await getTransactionCharge(data.amount);

      // Calculate total amount (amount + charge)
      const totalAmount = parseFloat(data.amount) + parseFloat(charge);

      if (parseFloat(user.balance) < totalAmount) {
        throw new Error(`Insufficient balance with transaction charge of ${charge}`);
      }

      // Create transaction
      const transaction = await prisma.transactions.create({
        data: {
          sender: { connect: { id: userId } },
          senderAccount: user.email, // Using email as sender account
          beneficiary: { connect: { id: data.beneficiaryId } },
          amount: data.amount,
          transactionType: data.transactionType || beneficiary.transactionType,
        },
      });

      // Deduct amount from user balance
      await prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: totalAmount,
          },
        },
      });

      return {
        transaction,
        charge,
        totalAmount,
      };
    });
  } catch (error) {
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

export async function getTransactionCharge(amount) {
  const amountValue = parseFloat(amount);
  
  try {
    // Find applicable charge for the amount
    const charge = await prisma.transactionCharge.findFirst({
      where: {
        minAmount: { lte: amountValue },
        maxAmount: { gte: amountValue },
      },
    });

    if (!charge) {
      // Return default charge if no range is defined
      return 0;
    }

    return charge.charge;
  } catch (error) {
    throw new Error(`Failed to get transaction charge: ${error.message}`);
  }
}

export async function getUserTransactions(userId, searchTerm, transactionBasis, limit, skip) {
  try {
    const where = {
      senderId: userId,
    };

    if (transactionBasis && transactionBasis !== 'ALL') {
      where.transactionType = transactionBasis;
    }

    if (searchTerm) {
      where.OR = [
        {
          beneficiary: {
            accountHolderName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
        {
          utr: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          transaction_no: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    const transactions = await prisma.transactions.findMany({
      where,
      take: limit,
      skip: skip,
      select: {
        id: true,
        amount: true,
        chargesAmount: true,
        transactionTime: true,
        transactionStatus: true,
        beneficiary: true,
        upiBeneficiary: true,
        dmtBeneficiary: true,
        referenceNo: true,
        utr: true,
        transaction_no: true,
        transactionType: true,
        gateway: true,
        createdAt: true,
      },
      orderBy: {
        transactionTime: 'desc',
      },
    });

    const totalTransactions = await prisma.transactions.count({ where });

    return {transactions, totalTransactions};
  } catch (error) {
    throw new Error(`Failed to get user transactions: ${error.message}`);
  }
}

export async function getTransactionById(id, userId) {
  try {
    const transaction = await prisma.transactions.findFirst({
      where: {
        id,
        senderId: userId,
      },
      include: {
        beneficiary: true,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  } catch (error) {
    throw new Error(`Failed to get transaction: ${error.message}`);
  }
}

export async function updateTransactionStatus(id, status) {
  try {
    // Only admin can update transaction status
    const updatedTransaction = await prisma.transactions.update({
      where: {
        id,
      },
      data: {
        transactionStatus: status,
      },
    });

    return updatedTransaction;
  } catch (error) {
    throw new Error(`Failed to update transaction status: ${error.message}`);
  }
}

export async function getAllTransactions() {
  try {
    // Only admin can get all transactions
    const transactions = await prisma.transactions.findMany({
      include: {
        sender: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
          },
        },
        beneficiary: true,
        upiBeneficiary: true,
        dmtBeneficiary: true,
      },
      orderBy: {
        transactionTime: 'desc',
      },
    });

    return transactions;
  } catch (error) {
    throw new Error(`Failed to get all transactions: ${error.message}`);
  }
}

export async function createTransactionWithCharges(userId, beneficiaryId, amount, type, description) {
  try {
    // Parse amount as float to ensure proper comparison
    const transactionAmount = parseFloat(amount);
    
    // Get applicable transaction charge from the database
    const transactionCharge = await prisma.transactionCharge.findFirst({
      where: {
        AND: [
          { minAmount: { lte: transactionAmount } },
          { maxAmount: { gte: transactionAmount } }
        ]
      }
    });

    
    // Check if a valid transaction charge slab exists for this amount
    if (!transactionCharge) {
      throw new Error('Transaction charge not found');
    }
    
    const chargeAmount = parseFloat(transactionCharge.charge);
    
    // Get the total amount to be deducted (transaction + charge)
    const totalDeduction = transactionAmount + chargeAmount;
    
    // Get user to check balance
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if beneficiary exists and is verified
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId }
    });
    
    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }
    
    if (!beneficiary.isVerified) {
      throw new Error('Beneficiary is not verified'); 
    }
    
    // Check if user has sufficient balance
    if (parseFloat(user.balance) < totalDeduction) {
      throw new Error(`Insufficient balance. Required: ₹${totalDeduction} (Amount: ₹${transactionAmount} + Charges: ₹${chargeAmount})`);
    }
    
    // Perform operations in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (prisma) => {
      // Deduct total amount from user balance
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: totalDeduction } }
      });
      
      // Create the transaction with COMPLETED status
      const transaction = await prisma.transactions.create({
        data: {
          amount: transactionAmount,
          transactionType: type,
          transactionStatus: "COMPLETED",
          senderAccount: user.phoneNumber, // Using phone number as sender account
          sender: { connect: { id: userId } },
          beneficiary: { connect: { id: beneficiaryId } },
          chargesAmount: chargeAmount // Assuming you've added this field to your schema
        }
      });
      
      return { user: updatedUser, transaction: transaction };
    });
    
    return result.transaction;
  } catch (error) {
    console.error("Error in createTransactionWithCharges:", error);
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
}
  