import React, { useState } from 'react';
import {
  Box,
  FormControl,
  Button,
  RadioGroup,
  Radio,
  Card,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import MasterCardIcon from '@/shared/icons/MasterCardIcon';
import VisaIcon from '@/shared/icons/VisaIcon';
import StripeIcon from '@/shared/icons/StripeIcon';
import PaypalIcon from '@/shared/icons/PaypalIcon';

const Payment: React.FC = () => {
  // const navigate = useNavigate();

  const handleSubmit = () => {
    //Todo: Add payment logic
  };

  return (
    <div className="flex bg-gray-900 items-center justify-center p-4">
      <div className="flex flex-col md:flex-row max-w-5xl bg-gray-900 rounded-lg p-8 gap-6">
        <Box display="flex" flexDirection="column" gap={4}>
          <h2 className="text-xl font-semibold text-white text-start">
            Payment Method
          </h2>
          <p className="text-gray-400 mb-7 text-start max-w-md">
            Manage and customize your payment preferences for seamless
            transactions
          </p>

          <FormControl isRequired>
            <RadioGroup className="flex flex-row gap-4">
              <Radio value="mastercard">
                <div className="flex items-center justify-center border border-borderLight bg-white rounded-sm p-2 w-14 h-10">
                  <MasterCardIcon />
                </div>
              </Radio>
              <Radio value="visa">
                <div className="flex items-center justify-center border border-borderLight bg-white rounded-sm p-2 w-14 h-10">
                  <VisaIcon />
                </div>
              </Radio>
              <Radio value="stripe">
                <div className="flex items-center justify-center border border-borderLight bg-white rounded-sm p-2 w-14 h-10">
                  <StripeIcon />
                </div>
              </Radio>
              <Radio value="paypal">
                <div className="flex items-center justify-center border border-borderLight bg-white rounded-sm p-2 w-14 h-10">
                  <PaypalIcon />
                </div>
              </Radio>
            </RadioGroup>
          </FormControl>
        </Box>

        <Box display="flex" flexDirection="column" gap={4}>
          <h2 className="text-xl font-semibold text-white text-start">
            Summary
          </h2>
          <p className="text-gray-400 mb-7 text-start">
            Here's a snapshot of everything you need to know at a glance
          </p>
          <Card className="flex flex-row rounded-lg p-4 gap-4">
            <div className="flex flex-row gap-2 justify-between">
              <p className="text-secondary">Monthly</p>
              <div className="flex flex-row gap-2 font-bold">
                <span>$</span>
                <span>0</span>
              </div>
            </div>
            <div className="flex flex-row gap-2 justify-between">
              <p className="text-secondary">Add discount</p>
              <div className="flex flex-row gap-2 font-bold">
                <span>$</span>
                <span>0</span>
              </div>
            </div>
            <div className="flex flex-row gap-2 justify-between">
              <p className="text-secondary">VAT</p>
              <div className="flex flex-row gap-2 font-bold">
                <span>$</span>
                <span>0</span>
              </div>
            </div>
            <div className="border-t border-borderLight dark:border-borderDark" />
            <div className="flex flex-row gap-2 justify-between">
              <p className="text-secondary">Total after trial</p>
              <div className="flex flex-row gap-2 font-bold">
                <span>$</span>
                <span>0</span>
              </div>
            </div>
          </Card>

          <Button
            className="px-4 bg-primary w-full"
            onClick={handleSubmit}
            variant="solid"
            colorScheme="primary"
          >
            Pay now
          </Button>
        </Box>
      </div>
    </div>
  );
};

export default Payment;



