import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Clipboard,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import RevenueCatUI from 'react-native-purchases-ui';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';

interface Payment {
  id: string;
  reference_number: string;
  amount: number;
  currency: string;
  status: string;
  bank_name: string;
  plan_type?: string;
  created_at: string;
  admin_note: string | null;
}

const BANK_DETAILS = {
  bankName: 'First National Bank (FNB) Namibia',
  accountName: 'NamStudy Prep',
  accountNumber: '62315274891',
  branchCode: '280172',
  branchName: 'Windhoek Main Branch',
  accountType: 'Cheque Account',
  swiftCode: 'FIABORWX',
};

export default function PaymentScreen() {
  const { user, isPro, customerInfo, manageSubscriptions, refreshSubscription } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [step, setStep] = useState<'info' | 'details' | 'confirm' | 'done'>('info');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showBankTransfer, setShowBankTransfer] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);

  // Subscription plan selection state
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const amount = selectedPlan === 'monthly' ? 60 : 540;
  const planTitleText = selectedPlan === 'monthly' ? 'VIP Monthly Access' : 'VIP Yearly Access (Best Value)';

  const hasRevenueCatSub = customerInfo?.entitlements.active['NamibStudy Prep Pro'] !== undefined;

  const handlePresentPaywall = async () => {
    setPaywallLoading(true);
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'NamibStudy Prep Pro',
      });

      if (result === 'PURCHASED' || result === 'RESTORED') {
        await refreshSubscription();
        Alert.alert(
          '🎉 Welcome to Pro!',
          'Your NamibStudy Prep Pro access has been activated instantly. Enjoy all premium features!',
          [{ text: 'Awesome!', onPress: () => router.back() }]
        );
      } else if (result === 'NOT_PRESENTED') {
        await refreshSubscription();
        Alert.alert(
          'Already Active',
          'You already have NamibStudy Prep Pro access!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
      // 'CANCELLED' or 'ERROR' – user dismissed, do nothing
    } catch (error: any) {
      console.error('Paywall error:', error);
      Alert.alert(
        'Something went wrong',
        'We couldn\'t open the subscription page. You can try again or use the bank transfer option below.',
        [{ text: 'OK' }]
      );
    } finally {
      setPaywallLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setPaymentHistory(data);
        const pending = data.find((p: Payment) => p.status === 'pending');
        if (pending) {
          setPayment(pending);
          setSelectedPlan((pending.amount >= 540 || pending.plan_type === 'yearly') ? 'yearly' : 'monthly');
          setStep('details');
        }
      }
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    }
    setLoadingHistory(false);
  };

  const handleCreatePayment = async () => {
    if (!user) return;
    setLoading(true);
    console.log('Payment Requested (Manual) by:', user.email, 'Plan:', selectedPlan);

    try {
      const ref = 'NM-' + Math.random().toString(36).substr(2, 6).toUpperCase();

      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          reference_number: ref,
          amount: amount,
          currency: 'NAD',
          status: 'pending',
          bank_name: BANK_DETAILS.bankName,
          plan_type: selectedPlan,
        })
        .select()
        .single();

      const newPayment = data || {
        id: 'temp-' + Date.now(),
        reference_number: ref,
        amount: amount,
        currency: 'NAD',
        status: 'pending',
        bank_name: BANK_DETAILS.bankName,
        plan_type: selectedPlan,
        created_at: new Date().toISOString(),
        admin_note: null,
      };

      setPayment(newPayment as Payment);
      setStep('details');
    } catch (err) {
      console.error('Failed to create payment record:', err);
      const ref = 'NM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
      setPayment({
        id: 'temp-' + Date.now(),
        reference_number: ref,
        amount: amount,
        currency: 'NAD',
        status: 'pending',
        bank_name: BANK_DETAILS.bankName,
        plan_type: selectedPlan,
        created_at: new Date().toISOString(),
        admin_note: null,
      } as Payment);
      setStep('details');
    }
    setLoading(false);
  };

  const handleConfirmPayment = async () => {
    if (!payment || !user) return;
    setLoading(true);
    console.log('Payment Confirmation initiated by:', user.email);

    const planDesc = payment.amount >= 540 ? 'Yearly Plan (N$540)' : 'Monthly Plan (N$60)';
    const message = `Hi! I've just made a payment of N$${payment.amount} (${planDesc}) for NamStudy VIP.\n\nMy Email: ${user.email}\nReference: ${payment.reference_number}`;
    const whatsappUrl = `https://wa.me/264816113313?text=${encodeURIComponent(message)}`;

    try {
      await Linking.openURL(whatsappUrl);
      setStep('done');
    } catch (err) {
      Alert.alert(
        'WhatsApp Not Found',
        `Please send your reference (${payment.reference_number}) and proof of payment to +264 81 611 3313 via WhatsApp manually.`
      );
      setStep('done');
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    try {
      Clipboard.setString(text);
    } catch {
      try {
        if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
          (navigator as any).clipboard.writeText(text);
        }
      } catch { }
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    Alert.alert('Copied!', `${field} copied to clipboard`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.gold;
      case 'approved': return COLORS.green;
      case 'rejected': return COLORS.red;
      default: return COLORS.textMuted;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.goldLight;
      case 'approved': return COLORS.greenLight;
      case 'rejected': return COLORS.redLight;
      default: return COLORS.surfaceAlt;
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case 'pending': return 'time';
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="person-circle-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Please sign in first</Text>
          <Text style={styles.emptyText}>You need an account to make a payment</Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => router.back()}>
            <Text style={styles.primaryActionBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isPro === undefined) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isPro === true) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.vipActiveCard}>
            <View style={styles.vipActiveIcon}>
              <Ionicons name="diamond" size={40} color={COLORS.gold} />
            </View>
            <Text style={styles.vipActiveTitle}>You're Already Pro!</Text>
            <Text style={styles.vipActiveText}>
              You have full access to all step-by-step solutions and unlimited quizzes.
            </Text>
            <TouchableOpacity style={styles.goldOutlineBtn} onPress={() => router.back()}>
              <Text style={styles.goldOutlineBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>

          {hasRevenueCatSub && (
            <TouchableOpacity
              style={styles.manageSubBtn}
              onPress={manageSubscriptions}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={18} color={COLORS.accent} />
              <Text style={styles.manageSubBtnText}>Manage Google Play Subscription</Text>
              <Ionicons name="open-outline" size={16} color={COLORS.accent} />
            </TouchableOpacity>
          )}

          {paymentHistory.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>Payment History</Text>
              {paymentHistory.map((p) => (
                <View key={p.id} style={styles.historyCard}>
                  <View style={styles.historyCardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusBg(p.status) }]}>
                      <Ionicons name={getStatusIcon(p.status)} size={14} color={getStatusColor(p.status)} />
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(p.status) }]}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.historyAmount}>N${p.amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyRef}>Ref: {p.reference_number}</Text>
                    <Text style={styles.historyDate}>{formatDate(p.created_at)}</Text>
                  </View>
                  {p.admin_note && (
                    <View style={styles.adminNoteBox}>
                      <Ionicons name="chatbubble" size={12} color={COLORS.textMuted} />
                      <Text style={styles.adminNoteText}>{p.admin_note}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade to VIP</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressContainer}>
        {['Generate Ref', 'Bank Transfer', 'Confirm', 'Verified'].map((label, i) => {
          const stepNames = ['info', 'details', 'confirm', 'done'];
          const currentIdx = stepNames.indexOf(step);
          const isActive = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <View key={i} style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                isActive && styles.progressDotActive,
                isCurrent && styles.progressDotCurrent,
              ]}>
                {isActive && i < currentIdx ? (
                  <Ionicons name="checkmark" size={12} color={COLORS.white} />
                ) : (
                  <Text style={[styles.progressDotText, isActive && styles.progressDotTextActive]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>
                {label}
              </Text>
              {i < 3 && <View style={[styles.progressLine, isActive && styles.progressLineActive]} />}
            </View>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Info & Plan Selector */}
        {step === 'info' && !showBankTransfer && (
          <View>
            {/* ── Features Card (shown first) ── */}
            <View style={styles.featuresCard}>
              <Text style={styles.featuresCardTitle}>What you'll get with Pro:</Text>
              {[
                { icon: 'document-text', text: 'Step-by-step worked solutions for ALL papers' },
                { icon: 'infinite', text: 'Unlimited topic quiz attempts' },
                { icon: 'analytics', text: 'Detailed performance analytics' },
                { icon: 'school', text: 'Exam tips and strategies' },
                { icon: 'notifications', text: 'New paper alerts' },
              ].map((f, i) => (
                <View key={i} style={styles.featureItem}>
                  <View style={styles.featureCheck}>
                    <Ionicons name={f.icon as any} size={16} color={COLORS.gold} />
                  </View>
                  <Text style={styles.featureItemText}>{f.text}</Text>
                </View>
              ))}
            </View>

            {/* ── Primary CTA: Google Play via RevenueCat Paywall ── */}
            <TouchableOpacity
              style={styles.paywallBtn}
              onPress={handlePresentPaywall}
              disabled={paywallLoading}
              activeOpacity={0.8}
            >
              {paywallLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="logo-google-playstore" size={22} color={COLORS.white} />
                  <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                    <Text style={styles.paywallBtnTitle}>Upgrade Instantly via Google Play</Text>
                    <Text style={styles.paywallBtnSub}>Secure checkout · Auto-renewal · Cancel anytime</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
                </>
              )}
            </TouchableOpacity>

            {/* ── Divider ── */}
            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* ── Secondary CTA: Manual Bank Transfer ── */}
            <TouchableOpacity
              style={styles.bankTransferBtn}
              onPress={() => setShowBankTransfer(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="business-outline" size={20} color={COLORS.accent} />
              <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                <Text style={styles.bankTransferBtnTitle}>Prefer an FNB Bank Transfer?</Text>
                <Text style={styles.bankTransferBtnSub}>Manual payment · Verified within 24 hours</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bank Transfer Flow (Step 1: Plan selection) ── */}
        {step === 'info' && showBankTransfer && (
          <View>
            <TouchableOpacity
              style={styles.backToPrimary}
              onPress={() => setShowBankTransfer(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
              <Text style={styles.backToPrimaryText}>Back to upgrade options</Text>
            </TouchableOpacity>

            <Text style={styles.sectionHeading}>Choose Your Subscription Plan</Text>
            <View style={styles.planSelectorRow}>
              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardActive]}
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.planCardTitle, selectedPlan === 'monthly' && styles.planCardTitleActive]}>Monthly</Text>
                <Text style={[styles.planCardPrice, selectedPlan === 'monthly' && styles.planCardPriceActive]}>N$60</Text>
                <Text style={styles.planCardSub}>Per month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardActive]}
                onPress={() => setSelectedPlan('yearly')}
                activeOpacity={0.8}
              >
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>Save N$180</Text>
                </View>
                <Text style={[styles.planCardTitle, selectedPlan === 'yearly' && styles.planCardTitleActive]}>Yearly</Text>
                <Text style={[styles.planCardPrice, selectedPlan === 'yearly' && styles.planCardPriceActive]}>N$540</Text>
                <Text style={styles.planCardSub}>12 Months (3 Free)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.priceHero}>
              <View style={styles.priceHeroIcon}>
                <Ionicons name="diamond" size={36} color={COLORS.gold} />
              </View>
              <Text style={styles.priceHeroTitle}>{planTitleText}</Text>
              <View style={styles.priceHeroRow}>
                <Text style={styles.priceHeroCurrency}>N$</Text>
                <Text style={styles.priceHeroAmount}>{amount}</Text>
                <Text style={styles.priceHeroPeriod}>/{selectedPlan === 'monthly' ? 'month' : 'year'}</Text>
              </View>
            </View>

            <View style={styles.howItWorksCard}>
              <Text style={styles.howItWorksTitle}>How Bank Transfer Works</Text>
              <View style={styles.howStep}>
                <View style={[styles.howStepDot, { backgroundColor: COLORS.primary + '15' }]}>
                  <Text style={[styles.howStepDotText, { color: COLORS.primary }]}>1</Text>
                </View>
                <Text style={styles.howStepText}>We generate a unique reference number for you</Text>
              </View>
              <View style={styles.howStep}>
                <View style={[styles.howStepDot, { backgroundColor: COLORS.accent + '15' }]}>
                  <Text style={[styles.howStepDotText, { color: COLORS.accent }]}>2</Text>
                </View>
                <Text style={styles.howStepText}>Make a bank transfer of N${amount} to our FNB account using the reference</Text>
              </View>
              <View style={styles.howStep}>
                <View style={[styles.howStepDot, { backgroundColor: COLORS.green + '15' }]}>
                  <Text style={[styles.howStepDotText, { color: COLORS.green }]}>3</Text>
                </View>
                <Text style={styles.howStepText}>Confirm your payment and our team verifies within 24 hours</Text>
              </View>
              <View style={styles.howStep}>
                <View style={[styles.howStepDot, { backgroundColor: COLORS.gold + '15' }]}>
                  <Text style={[styles.howStepDotText, { color: COLORS.gold }]}>4</Text>
                </View>
                <Text style={styles.howStepText}>VIP access activated instantly!</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.generateBtn}
              onPress={handleCreatePayment}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="receipt" size={20} color={COLORS.white} />
                  <Text style={styles.generateBtnText}>Generate Payment Reference</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Bank Details */}
        {step === 'details' && payment && (
          <View>
            <View style={styles.referenceCard}>
              <View style={styles.referenceHeader}>
                <Ionicons name="receipt" size={20} color={COLORS.primary} />
                <Text style={styles.referenceLabel}>Your Payment Reference</Text>
              </View>
              <TouchableOpacity
                style={styles.referenceBox}
                onPress={() => copyToClipboard(payment.reference_number, 'Reference Number')}
                activeOpacity={0.7}
              >
                <Text style={styles.referenceNumber}>{payment.reference_number}</Text>
                <View style={styles.copyBtn}>
                  <Ionicons
                    name={copiedField === 'Reference Number' ? 'checkmark' : 'copy'}
                    size={18}
                    color={copiedField === 'Reference Number' ? COLORS.green : COLORS.primary}
                  />
                </View>
              </TouchableOpacity>
              <View style={styles.referenceWarning}>
                <Ionicons name="warning" size={14} color={COLORS.goldDark} />
                <Text style={styles.referenceWarningText}>
                  Use this EXACT reference when making your bank transfer
                </Text>
              </View>
            </View>

            <View style={styles.bankCard}>
              <View style={styles.bankCardHeader}>
                <View style={styles.bankIconContainer}>
                  <Ionicons name="business" size={24} color={COLORS.accent} />
                </View>
                <View>
                  <Text style={styles.bankCardTitle}>Bank Transfer Details</Text>
                  <Text style={styles.bankCardSub}>Transfer N${payment.amount.toFixed(2)} to this account</Text>
                </View>
              </View>

              {[
                { label: 'Bank', value: BANK_DETAILS.bankName, key: 'bank' },
                { label: 'Account Name', value: BANK_DETAILS.accountName, key: 'name' },
                { label: 'Account Number', value: BANK_DETAILS.accountNumber, key: 'accnum' },
                { label: 'Branch Code', value: BANK_DETAILS.branchCode, key: 'branch' },
                { label: 'Branch Name', value: BANK_DETAILS.branchName, key: 'branchname' },
                { label: 'Account Type', value: BANK_DETAILS.accountType, key: 'type' },
                { label: 'Amount', value: `N$${payment.amount.toFixed(2)}`, key: 'amount' },
                { label: 'Reference', value: payment.reference_number, key: 'ref' },
              ].map((detail) => (
                <TouchableOpacity
                  key={detail.key}
                  style={styles.bankDetailRow}
                  onPress={() => copyToClipboard(detail.value, detail.label)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bankDetailLabel}>{detail.label}</Text>
                  <View style={styles.bankDetailValueRow}>
                    <Text style={styles.bankDetailValue}>{detail.value}</Text>
                    <Ionicons
                      name={copiedField === detail.label ? 'checkmark-circle' : 'copy-outline'}
                      size={16}
                      color={copiedField === detail.label ? COLORS.green : COLORS.textMuted}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tipCard}>
              <Ionicons name="bulb" size={18} color={COLORS.gold} />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Quick Tip</Text>
                <Text style={styles.tipText}>
                  You can use FNB eWallet, FNB App, Internet Banking, or visit any FNB branch to make the transfer.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.paidBtn}
              onPress={() => setStep('confirm')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
              <Text style={styles.paidBtnText}>I's Made the Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={() => router.back()}>
              <Text style={styles.laterBtnText}>I'll pay later (reference saved)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && payment && (
          <View>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Ionicons name="help-circle" size={48} color={COLORS.accent} />
              </View>
              <Text style={styles.confirmTitle}>Confirm Your Payment</Text>
              <Text style={styles.confirmText}>
                Please confirm that you have transferred N${payment.amount.toFixed(2)} to the FNB account with reference:
              </Text>
              <View style={styles.confirmRefBox}>
                <Text style={styles.confirmRef}>{payment.reference_number}</Text>
              </View>
              <Text style={styles.confirmNote}>
                Once confirmed, our team will verify your payment within 24 hours. Your VIP access will be activated automatically after verification.
              </Text>
            </View>

            <View style={styles.confirmSummary}>
              <Text style={styles.confirmSummaryTitle}>Payment Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Plan</Text>
                <Text style={styles.summaryValue}>{payment.amount >= 540 ? 'VIP Yearly Plan' : 'VIP Monthly Plan'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amount</Text>
                <Text style={styles.summaryValue}>N${payment.amount.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Duration</Text>
                <Text style={styles.summaryValue}>{payment.amount >= 540 ? '365 days (1 Year)' : '30 days (1 Month)'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Method</Text>
                <Text style={styles.summaryValue}>FNB Bank Transfer</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryLabel}>Reference</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary, fontWeight: '700' }]}>{payment.reference_number}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmPayment}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
                  <Text style={styles.confirmBtnText}>Confirm - I've Paid N${payment.amount.toFixed(2)}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={() => setStep('details')}>
              <Text style={styles.laterBtnText}>Go back to bank details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <View>
            <View style={styles.doneCard}>
              <View style={styles.doneIconOuter}>
                <View style={styles.doneIconInner}>
                  <Ionicons name="time" size={48} color={COLORS.gold} />
                </View>
              </View>
              <Text style={styles.doneTitle}>Payment Submitted!</Text>
              <Text style={styles.doneText}>
                Thank you! Your payment confirmation has been received. Our team will verify your bank transfer and activate your VIP access.
              </Text>

              <View style={styles.doneTimeline}>
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: COLORS.green }]}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Payment reference generated</Text>
                    <Text style={styles.timelineTime}>Completed</Text>
                  </View>
                </View>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: COLORS.green }]}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Payment confirmed by you</Text>
                    <Text style={styles.timelineTime}>Completed</Text>
                  </View>
                </View>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: COLORS.gold }]}>
                    <Ionicons name="time" size={12} color={COLORS.gold} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Admin verification</Text>
                    <Text style={[styles.timelineTime, { color: COLORS.gold }]}>Pending (up to 24 hours)</Text>
                  </View>
                </View>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: COLORS.border }]}>
                    <Ionicons name="diamond" size={12} color={COLORS.textMuted} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTitle, { color: COLORS.textMuted }]}>VIP activated</Text>
                    <Text style={styles.timelineTime}>Waiting</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="home" size={20} color={COLORS.white} />
              <Text style={styles.doneBtnText}>Back to Home</Text>
            </TouchableOpacity>

            <View style={styles.supportCard}>
              <Ionicons name="chatbubbles" size={18} color={COLORS.accent} />
              <Text style={styles.supportText}>
                Need help? Contact us at sversatech@gmail.com
              </Text>
            </View>
          </View>
        )}

        {paymentHistory.length > 0 && step !== 'done' && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>Your Payment History</Text>
            {paymentHistory.map((p) => (
              <View key={p.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(p.status) }]}>
                    <Ionicons name={getStatusIcon(p.status)} size={14} color={getStatusColor(p.status)} />
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(p.status) }]}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>N${p.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyRef}>Ref: {p.reference_number}</Text>
                  <Text style={styles.historyDate}>{formatDate(p.created_at)}</Text>
                </View>
                {p.admin_note && (
                  <View style={styles.adminNoteBox}>
                    <Ionicons name="chatbubble" size={12} color={COLORS.textMuted} />
                    <Text style={styles.adminNoteText}>{p.admin_note}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...FONTS.h3, color: COLORS.white },
  scrollContent: { padding: SPACING.xl },
  centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyText: { ...FONTS.caption, color: COLORS.textMuted, marginTop: SPACING.xs, marginBottom: SPACING.xl },
  primaryActionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xxl, paddingVertical: 12, borderRadius: RADIUS.md },
  primaryActionBtnText: { ...FONTS.bodyBold, color: COLORS.white },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, paddingVertical: SPACING.lg, paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: COLORS.green },
  progressDotCurrent: { backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.primaryLight },
  progressDotText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  progressDotTextActive: { color: COLORS.white },
  progressLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, marginLeft: 4 },
  progressLabelActive: { color: COLORS.textPrimary },
  progressLine: { width: 16, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
  progressLineActive: { backgroundColor: COLORS.green },
  sectionHeading: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  planSelectorRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  planCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', ...SHADOWS.sm, position: 'relative' },
  planCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  planCardTitle: { ...FONTS.bodyBold, color: COLORS.textSecondary, marginBottom: 4 },
  planCardTitleActive: { color: COLORS.primary },
  planCardPrice: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 2 },
  planCardPriceActive: { color: COLORS.primary },
  planCardSub: { fontSize: 11, color: COLORS.textMuted },
  discountBadge: { position: 'absolute', top: -10, backgroundColor: COLORS.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  discountBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.white },
  priceHero: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.md, borderWidth: 2, borderColor: COLORS.gold },
  priceHeroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.goldLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  priceHeroTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  priceHeroRow: { flexDirection: 'row', alignItems: 'flex-end' },
  priceHeroCurrency: { fontSize: 18, fontWeight: '700', color: COLORS.goldDark, marginBottom: 4 },
  priceHeroAmount: { fontSize: 44, fontWeight: '900', color: COLORS.goldDark, lineHeight: 48 },
  priceHeroPeriod: { fontSize: 14, fontWeight: '500', color: COLORS.goldDark, marginBottom: 8 },
  featuresCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.lg, ...SHADOWS.sm },
  featuresCardTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  featureCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.goldLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  featureItemText: { ...FONTS.body, color: COLORS.textPrimary, flex: 1, fontSize: 13 },
  howItWorksCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.sm },
  howItWorksTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  howStepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  howStepDotText: { fontSize: 11, fontWeight: '800' },
  howStepText: { ...FONTS.body, color: COLORS.textSecondary, flex: 1, fontSize: 13, lineHeight: 18 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 16, ...SHADOWS.lg },
  generateBtnText: { ...FONTS.h3, color: COLORS.white, fontSize: 16 },
  referenceCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.lg, ...SHADOWS.md, borderWidth: 2, borderColor: COLORS.primary + '30' },
  referenceHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  referenceLabel: { ...FONTS.bodyBold, color: COLORS.primary },
  referenceBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary + '08', borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed' },
  referenceNumber: { fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  copyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '15', alignItems: 'center', justifyContent: 'center' },
  referenceWarning: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md, backgroundColor: COLORS.goldLight, padding: SPACING.md, borderRadius: RADIUS.sm },
  referenceWarningText: { ...FONTS.small, color: COLORS.goldDark, flex: 1, fontWeight: '600' },
  bankCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.lg, ...SHADOWS.sm },
  bankCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  bankIconContainer: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.accent + '15', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  bankCardTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  bankCardSub: { ...FONTS.small, color: COLORS.textMuted },
  bankDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  bankDetailLabel: { ...FONTS.caption, color: COLORS.textMuted },
  bankDetailValueRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bankDetailValue: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.goldLight, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.xl, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.gold + '30' },
  tipContent: { flex: 1 },
  tipTitle: { ...FONTS.caption, color: COLORS.goldDark, fontWeight: '700', marginBottom: 2 },
  tipText: { ...FONTS.small, color: COLORS.goldDark, lineHeight: 18 },
  paidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.green, borderRadius: RADIUS.md, paddingVertical: 16, marginBottom: SPACING.md, ...SHADOWS.lg },
  paidBtnText: { ...FONTS.h3, color: COLORS.white, fontSize: 16 },
  laterBtn: { alignItems: 'center', paddingVertical: SPACING.md },
  laterBtnText: { ...FONTS.caption, color: COLORS.textMuted },
  confirmCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.md },
  confirmIcon: { marginBottom: SPACING.md },
  confirmTitle: { ...FONTS.h2, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  confirmText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  confirmRefBox: { backgroundColor: COLORS.primary + '10', borderRadius: RADIUS.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '30' },
  confirmRef: { ...FONTS.h3, color: COLORS.primary, letterSpacing: 1 },
  confirmNote: { ...FONTS.small, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  confirmSummary: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.xl, ...SHADOWS.sm },
  confirmSummaryTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  summaryLabel: { ...FONTS.caption, color: COLORS.textMuted },
  summaryValue: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.green, borderRadius: RADIUS.md, paddingVertical: 16, marginBottom: SPACING.md, ...SHADOWS.lg },
  confirmBtnText: { ...FONTS.h3, color: COLORS.white, fontSize: 16 },
  doneCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.md },
  doneIconOuter: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.goldLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  doneIconInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  doneTitle: { ...FONTS.h2, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  doneText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  doneTimeline: { width: '100%' },
  timelineItem: { flexDirection: 'row', alignItems: 'center' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  timelineContent: { flex: 1 },
  timelineTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, fontSize: 13 },
  timelineTime: { ...FONTS.small, color: COLORS.textMuted },
  timelineConnector: { width: 2, height: 20, backgroundColor: COLORS.border, marginLeft: 13, marginVertical: 2 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 16, marginBottom: SPACING.lg, ...SHADOWS.lg },
  doneBtnText: { ...FONTS.h3, color: COLORS.white, fontSize: 16 },
  supportCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.accent + '10', borderRadius: RADIUS.md, padding: SPACING.lg },
  supportText: { ...FONTS.caption, color: COLORS.accent },
  vipActiveCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.xxl, alignItems: 'center', marginBottom: SPACING.lg, ...SHADOWS.md, borderWidth: 2, borderColor: COLORS.gold },
  vipActiveIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.goldLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  vipActiveTitle: { ...FONTS.h2, color: COLORS.goldDark, marginBottom: SPACING.sm },
  vipActiveText: { ...FONTS.body, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  goldOutlineBtn: { paddingHorizontal: SPACING.xxl, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.gold },
  goldOutlineBtnText: { ...FONTS.bodyBold, color: COLORS.goldDark },
  historySection: { marginTop: SPACING.xl },
  historySectionTitle: { ...FONTS.h3, color: COLORS.textPrimary, marginBottom: SPACING.md },
  historyCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.sm, ...SHADOWS.sm, borderWidth: 1, borderColor: COLORS.borderLight },
  historyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full },
  statusBadgeText: { ...FONTS.small, fontWeight: '700' },
  historyAmount: { ...FONTS.bodyBold, color: COLORS.textPrimary },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  historyRef: { ...FONTS.small, color: COLORS.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  historyDate: { ...FONTS.small, color: COLORS.textMuted },
  adminNoteBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm, backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm },
  adminNoteText: { ...FONTS.small, color: COLORS.textSecondary, flex: 1 },

  // ── RevenueCat Paywall & Bank Transfer toggle styles ──
  paywallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.xl,
  },
  paywallBtnTitle: { ...FONTS.bodyBold, color: COLORS.white, fontSize: 16 },
  paywallBtnSub: { ...FONTS.small, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { ...FONTS.caption, color: COLORS.textMuted, marginHorizontal: SPACING.lg },
  bankTransferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1.5,
    borderColor: COLORS.accent + '40',
    ...SHADOWS.sm,
  },
  bankTransferBtnTitle: { ...FONTS.bodyBold, color: COLORS.textPrimary, fontSize: 14 },
  bankTransferBtnSub: { ...FONTS.small, color: COLORS.textMuted, marginTop: 2 },
  backToPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  backToPrimaryText: { ...FONTS.caption, color: COLORS.primary },
  manageSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent + '10',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + '25',
  },
  manageSubBtnText: { ...FONTS.caption, color: COLORS.accent, flex: 1 },
});