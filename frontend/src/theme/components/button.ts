import { mode } from "@chakra-ui/theme-tools";
import { ThemeComponentProps } from "@chakra-ui/react";

const Button = {
  baseStyle: (props: ThemeComponentProps) => ({
    bg: mode('white', 'zinc.800')(props),
    color: mode('black', 'white')(props),
    _hover: {
      bg: mode('zinc.100', 'zinc.700')(props),
    },
  }),
  variants: {
    primary: (props: ThemeComponentProps) => ({
      bg: "brand.600",
      color: "white",
      _hover: {
        bg: "brand.700",
        _disabled: {
          bg: "brand.600",
        }
      },
      _active: {
        bg: "brand.800",
      },
      _disabled: {
        bg: "brand.600", // Or a muted version like brand.400 if preferred
        opacity: 0.4,
        cursor: "not-allowed",
        boxShadow: "none",
      },
    }),
    secondary: (props: ThemeComponentProps) => {
      const textColor = mode("zinc.900", "white")(props);
      return {
        border: "1px solid",
        borderColor: textColor,
        bg: "transparent",
        color: textColor,
        _hover: {
          bg: mode("zinc.100", "zinc.800")(props),
        },
        _active: {
          bg: mode("zinc.200", "zinc.700")(props),
        },
      };
    },
    solid: (props: ThemeComponentProps) => ({
      // Mapping 'solid' to look like primary by default or keep as secondary action
      // For now, let's update it to use the new tokens to avoid breaking 'primary.500'
      bg: mode("zinc.900", "white")(props),
      color: mode("white", "zinc.900")(props),
      _hover: {
        bg: mode("zinc.700", "zinc.200")(props),
      },
      _disabled: {
        bg: mode("zinc.300", "zinc.600")(props),
        color: mode("zinc.500", "zinc.400")(props),
      }
    }),
    outline: (props: ThemeComponentProps) => ({
      border: "1px solid",
      borderColor: mode("zinc.200", "zinc.700")(props),
      bg: "transparent",
      color: mode("zinc.900", "white")(props),
      _hover: {
        bg: mode("zinc.100", "zinc.800")(props),
      },
    }),
    ghost: (props: ThemeComponentProps) => ({
      bg: "transparent",
      color: mode("zinc.700", "zinc.300")(props),
      _hover: {
        bg: mode("zinc.100", "zinc.800")(props),
        color: mode("zinc.900", "white")(props),
      },
    }),
    link: (props: ThemeComponentProps) => ({
      color: "brand.600",
      bg: "transparent",
      _hover: {
        textDecoration: "underline",
        color: "brand.700",
      },
    }),
  },
};

export default Button;

