import React from 'react';
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
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/app/constants/theme';
import { useUser } from '@/app/context/UserContext';

const { width } = Dimensions.get('window');

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export default function UpgradeModal({ visible, onClose, onUpgrade }: UpgradeModalProps) {
  const router = useRouter();
  const { user } = useUser();

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
      router.push('/payment');
    }
  };

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

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>VIP Access</Text>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>N$</Text>
              <Text style={styles.price}>30</Text>
              <Text style={styles.period}>/month</Text>
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
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  featuresList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  priceContainer: {
    backgroundColor: COLORS.goldLight,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  priceLabel: {
    ...FONTS.caption,
    color: COLORS.goldDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currency: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.goldDark,
    marginBottom: 4,
  },
  price: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.goldDark,
    lineHeight: 52,
  },
  period: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.goldDark,
    marginBottom: 8,
  },
  paymentMethod: {
    ...FONTS.small,
    color: COLORS.goldDark,
    marginTop: SPACING.xs,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    paddingHorizontal: SPACING.xxl,
    width: '100%',
    marginBottom: SPACING.md,
    ...SHADOWS.lg,
  },
  upgradeBtnText: {
    ...FONTS.h3,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  dismissText: {
    ...FONTS.caption,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  socialProofText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
});
