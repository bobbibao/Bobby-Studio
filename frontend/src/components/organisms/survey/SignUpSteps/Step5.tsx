import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { FormControl, FormLabel, FormErrorMessage, Radio, RadioGroup } from '@chakra-ui/react';
import { RootState } from '@/store';
import { useTranslation } from 'react-i18next';

const Step5: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data } = useSelector((state: RootState) => state.survey);

  const formConfig = [
    {
      name: 'f1',
      label: 'who_will_be_using_the_tool_in_your_team',
      options: [
        { value: 'Just me', label: 'just_me' },
        { value: 'Small team (2 - 5 people)', label: 'small_team_2_5_people' },
        { value: 'Medium team ( 6 - 15 people)', label: 'medium_team_6_15_people' },
        { value: 'Large team (15+ people)', label: 'large_team_15_people' },
      ],
    },
    {
      name: 'f2',
      label: 'what_types_of_projects_will_you_primarily_use_bobby_for',
      options: [
        { value: 'Residential', label: 'residential' },
        { value: 'Commercial', label: 'commercial' },
        { value: 'Industrial', label: 'industrial' },
        { value: 'Public/Institutional', label: 'public_institutional' },
        { value: 'Mixed-use', label: 'mixed_use' },
        { value: 'Urban planning', label: 'urban_planning' },
        { value: 'Interior design', label: 'interior_design' },
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

export default Step5;

