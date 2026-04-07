import React from "react";
import { useFormContext } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from '@/store';
import { FormControl, FormLabel, Input, FormErrorMessage } from "@chakra-ui/react";

const Step0: React.FC = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data } = useSelector((state: RootState) => state.survey);

  return (
    <FormControl isInvalid={!!errors.email}>
      <FormLabel>Email</FormLabel>
      <Input
        {...register("email")}
        placeholder="Enter your email"
        defaultValue={data.email || ""}
      />
      <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
    </FormControl>
  );
};

export default Step0;

