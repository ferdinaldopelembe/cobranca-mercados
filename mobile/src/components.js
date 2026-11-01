import { useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export const colors = {
  primary: "#176B57",
  primaryDark: "#105241",
  background: "#F4F7F6",
  surface: "#FFFFFF",
  text: "#172A25",
  muted: "#6B7C76",
  border: "#DCE6E1",
  danger: "#B42318",
  success: "#18794E",
  warning: "#A15C00",
};

export function Icon({ name, size = 20, color = colors.muted }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  compact,
  icon,
  iconPosition = "left",
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        disabled && styles.buttonDisabled,
      ]}
    >
      {icon && iconPosition === "left" ? (
        <Icon name={icon} size={compact ? 17 : 19} color={buttonIconColor(variant)} />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.buttonSecondaryText,
          variant === "danger" && styles.buttonDangerText,
        ]}
      >{title}</Text>
      {icon && iconPosition === "right" ? (
        <Icon name={icon} size={compact ? 17 : 19} color={buttonIconColor(variant)} />
      ) : null}
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
  options,
  editable = true,
  autoCapitalize,
  icon,
}) {
  const [open, setOpen] = useState(false);

  if (options) {
    const selected = options.find((option) => String(option.value) === String(value));
    return (
      <View style={styles.fieldWrap}>
        <Label>{label}</Label>
        <Pressable
          accessibilityRole="button"
          disabled={!editable}
          onPress={() => setOpen(true)}
          style={[styles.input, styles.selectInput, !editable && styles.inputDisabled]}
        >
          {icon ? <Icon name={icon} size={19} color={colors.muted} /> : null}
          <Text style={[selected ? styles.inputText : styles.placeholder, styles.selectLabel]}>
            {selected?.label || placeholder || "Seleccionar…"}
          </Text>
          <Icon name="chevron-down" size={20} color={editable ? colors.muted : colors.border} />
        </Pressable>
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
            <Pressable style={styles.optionSheet} onPress={(event) => event.stopPropagation()}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                {options.map((option) => (
                  <Pressable
                    key={String(option.value)}
                    onPress={() => {
                      onChangeText(String(option.value));
                      setOpen(false);
                    }}
                    style={styles.option}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        String(option.value) === String(value) && styles.optionSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Button title="Fechar" variant="secondary" onPress={() => setOpen(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <View style={[styles.inputContainer, multiline && styles.multilineContainer, !editable && styles.inputDisabled]}>
        {icon ? <Icon name={icon} size={19} color={colors.muted} /> : null}
        <TextInput
          accessibilityLabel={label}
          value={value == null ? "" : String(value)}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize || "sentences"}
          style={[
            styles.inputTextField,
            multiline && styles.multiline,
            !editable && styles.inputDisabled,
          ]}
        />
      </View>
    </View>
  );
}

export function Notice({ children, tone = "error" }) {
  if (!children) return null;
  return (
    <View style={[styles.notice, tone === "success" && styles.successNotice]}>
      <Icon
        name={tone === "success" ? "check-circle-outline" : "alert-circle-outline"}
        size={19}
        color={tone === "success" ? colors.success : colors.danger}
      />
      <Text style={[styles.noticeText, tone === "success" && styles.successNoticeText]}>
        {children}
      </Text>
    </View>
  );
}

export function Loading({ label = "A carregar…" }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.mutedText}>{label}</Text>
    </View>
  );
}

function buttonIconColor(variant) {
  if (variant === "secondary") return colors.primaryDark;
  if (variant === "danger") return colors.danger;
  return "#FFFFFF";
}

export const commonStyles = StyleSheet.create({
  page: { padding: 18, paddingBottom: 36, gap: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  mutedText: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  button: {
    minHeight: 46,
    backgroundColor: colors.primary,
    borderRadius: 11,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonCompact: { minHeight: 38, paddingHorizontal: 12 },
  buttonSecondary: { backgroundColor: "#E9F1ED", borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: "#FDECEB" },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  buttonSecondaryText: { color: colors.primaryDark },
  buttonDangerText: { color: colors.danger },
  fieldWrap: { gap: 6 },
  label: { color: colors.text, fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 46,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  inputContainer: {
    minHeight: 46,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.surface,
  },
  inputTextField: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 15,
  },
  inputText: { color: colors.text, fontSize: 15 },
  placeholder: { color: colors.muted, fontSize: 15 },
  selectLabel: { flex: 1 },
  selectInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inputDisabled: { backgroundColor: "#F1F4F2", color: colors.muted },
  multilineContainer: { alignItems: "flex-start", paddingTop: 3 },
  multiline: { minHeight: 84, textAlignVertical: "top", paddingTop: 8 },
  chevron: { color: colors.muted, fontSize: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,25,20,0.42)",
    justifyContent: "flex-end",
  },
  optionSheet: {
    maxHeight: "78%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    gap: 10,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: "700", paddingBottom: 5 },
  option: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, justifyContent: "center" },
  optionText: { color: colors.text, fontSize: 15 },
  optionSelected: { color: colors.primary, fontWeight: "700" },
  notice: { padding: 12, borderRadius: 10, backgroundColor: "#FDECEB", borderWidth: 1, borderColor: "#F5C4C1", flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noticeText: { color: colors.danger, fontSize: 13, lineHeight: 19, flex: 1 },
  successNotice: { backgroundColor: "#E8F5ED", borderColor: "#B8E1C8" },
  successNoticeText: { color: colors.success },
  loading: { padding: 24, alignItems: "center", gap: 10 },
});
