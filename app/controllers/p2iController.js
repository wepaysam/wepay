import { NextResponse } from 'next/server';

export const getP2IBalance = async () => {
    try {
        const response = await fetch(`${process.env.P2I_API_URL}/apiclient/balance-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_code': 'P2I',
                'Authorization': `Bearer ${process.env.P2I_AUTH_TOKEN}`
            },
        });

        const data = await response.json();

        if (response.ok && data.code === 200) {
            return data.data.balance;
        } else {
            console.error(`Failed to fetch P2I balance:`, data);
            return 0;
        }
    } catch (error) {
        console.error(`Error fetching P2I balance:`, error);
        return 0;
    }
};