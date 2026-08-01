import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/theme';
import { useUser } from '@/context/UserContext';

const { width } = Dimensions.get('window');

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function UpgradeModal({ visible, onClose, onUpgrade }: UpgradeModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const features = [
    { icon: 'document-text', text: 'Step-by-step worked solutions' },
    { icon: 'infinite', text: 'Unlimited topic quizzes' },
    { icon: 'analytics', text: 'Performance tracking' },
    { icon: 'school', text: 'Exam tips & strategies' },
  ];

  const handleUpgrade = () => {
    onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push({
        pathname: '/payment',
        params: { plan: selectedPlan },
      });
    }
  };

  const amount = selectedPlan === 'monthly' ? 30 : 300;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Lock icon */}
          <View style={styles.lockContainer}>
            <View style={styles.lockCircle}>
              <Ionicons name="lock-closed" size={32} color={COLORS.gold} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Stuck on a Problem?</Text>
          <Text style={styles.subtitle}>
            Get detailed step-by-step solutions to every past exam paper and unlimited quiz practice.
          </Text>

          {/* Features */}
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.checkCircle}>
                  <Ionicons name={feature.icon as any} size={16} color={COLORS.gold} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Plan Selector inside Modal */}
          <View style={styles.planSelectorRow}>
            <TouchableOpacity
              style={[styles.planTab, selectedPlan === 'monthly' && styles.planTabActive]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.planTabText, selectedPlan === 'monthly' && styles.planTabTextActive]}>
                Monthly (N$30)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planTab, selectedPlan === 'yearly' && styles.planTabActive]}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.8}
            >
              <View style={styles.modalDiscountBadge}>
                <Text style={styles.modalDiscountText}>Save N$60</Text>
              </View>
              <Text style={[styles.planTabText, selectedPlan === 'yearly' && styles.planTabTextActive]}>
                Yearly (N$300)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price Box */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>
              {selectedPlan === 'monthly' ? 'VIP Monthly Access' : 'VIP Yearly Access (2 Months Free)'}
            </Text>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>N$</Text>
              <Text style={styles.price}>{amount}</Text>
              <Text style={styles.period}>/{selectedPlan === 'monthly' ? 'month' : 'year'}</Text>
            </View>
            <Text style={styles.paymentMethod}>Pay via FNB Bank Transfer</Text>
          </View>

          {/* Upgrade button */}
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={handleUpgrade}
            activeOpacity={0.8}
          >
            <Ionicons name="diamond" size={20} color={COLORS.white} />
            <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </TouchableOpacity>

          {/* Social proof */}
          <View style={styles.socialProof}>
            <Ionicons name="people" size={14} color={COLORS.textMuted} />
            <Text style={styles.socialProofText}>
              Join 2,400+ Namibian students already using NamMath VIP
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.lg,
    paddingBottom: 40,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockContainer: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  lockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  featuresList: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  planSelectorRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.md,
  },
  planTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    position: 'relative',
  },
  planTabActive: {
    backgroundColor: COLORS.goldLight,
    borderColor: COLORS.gold,
  },
  planTabText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  planTabTextActive: {
    color: COLORS.goldDark,
    fontWeight: '700',
  },
  modalDiscountBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  modalDiscountText: {
    fontSize: 8,
    fontWeight: '800',
    color: COLORS.white,
  },
  priceContainer: {
    backgroundColor: COLORS.goldLight,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  priceLabel: {
    ...FONTS.caption,
    color: COLORS.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currency: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.goldDark,
    marginBottom: 4,
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.goldDark,
    lineHeight: 44,
  },
  period: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.goldDark,
    marginBottom: 6,
  },
  paymentMethod: {
    ...FONTS.small,
    color: COLORS.goldDark,
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xxl,
    width: '100%',
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  upgradeBtnText: {
    ...FONTS.h3,
    color: COLORS.white,
    marginLeft: SPACING.sm,
    fontSize: 16,
  },
  dismissText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  socialProofText: {
    ...FONTS.small,
    color: COLORS.textMuted,
    fontSize: 11,
  },
});