import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { sha256 } from 'js-sha256';
import { supabase } from '../config/supabase';
import { paymentProvider, playRestorationEnabled } from '../config/paymentProvider';
import { getAuthEpoch } from './authState';
import { getOrdersByUser } from '../repositories/ordersRepository';
import { createStandalonePlayBilling } from './playBillingCore';

// Lazy native import: Razorpay distributions never initialize the IAP module.
const billing = createStandalonePlayBilling({
  projectUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://billing.invalid',
  AsyncStorage, Platform, Application, sha256, supabase, getOrdersByUser, getAuthEpoch,
  purchasesEnabled: paymentProvider === 'play',
  getNativeBilling: async () => {
    if (!playRestorationEnabled) throw new Error('Play Billing is unavailable in this distribution.');
    return import('expo-iap');
  },
  fetch: (...args) => fetch(...args),
});

export const { createPlayOrder, fetchMatchingPlayProduct, startPlayPurchase,
  subscribePlayBilling, restorePlayPurchases, recheckPlayOrder } = billing;
