import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { FormControl, FormLabel, FormErrorMessage, Radio, RadioGroup } from '@chakra-ui/react';
import { RootState } from '@/store';
import { useTranslation } from 'react-i18next';

const Step3: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data } = useSelector((state: RootState) => state.survey);

  const formConfig = [
    {
      name: 's1',
      label: 'how_familiar_are_you_with_ai_visualization_tools',
      options: [
        { value: 'Never used them', label: 'never_used_them' },
        { value: 'Basic understanding', label: 'basic_understanding' },
        { value: 'Regular user', label: 'regular_user' },
        { value: 'Advanced user', label: 'advanced_user' },
      ],
    },
    {
      name: 's2',
      label: 'what_aspects_of_ai_visualization_interest_you_most',
      options: [
        { value: 'Speed of generation', label: 'speed_of_generation' },
        { value: 'Cost efficiency', label: 'cost_efficiency' },
        { value: 'Design exploration', label: 'design_exploration' },
        { value: 'Quality of output', label: 'quality_of_output' },
        { value: 'Ease of use', label: 'ease_of_use' },
        { value: 'Integration with existing tools', label: 'integration_with_existing_tools' },
      ],
    },
  ];

  return (
    <div>
      {formConfig.map((field) => (
        <FormControl
          key={field.name}
          isInvalid={!!errors[field.name]}
          className={'mt-10'}
        >
          <FormLabel>{t('profile:' + field.label)}</FormLabel>
          <RadioGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field.options.map((option) => (
                <Radio
                  key={option.value}
                  value={option.value}
                  {...register(field.label)}
                >
                  {t('profile:' + option.label)}
                </Radio>
              ))}
            </div>
          </RadioGroup>
          {errors?.[field.name]?.message && <FormErrorMessage>{String(errors[field.name]?.message)}</FormErrorMessage>}
        </FormControl>
      ))}
    </div>
  );
};

export default Step3;

