import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  Radio,
  RadioGroup,
} from '@chakra-ui/react';
import { RootState } from '@/store';
import { useTranslation } from 'react-i18next';

const Step2: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data } = useSelector((state: RootState) => state.survey);

  const formConfig = [
    {
      name: 'mainVisualizationNeed',
      label: 'what_are_your_main_visualization_need',
      options: [
        {
          value: 'Early concept development',
          label: 'early_concept_development',
        },
        { value: 'Client presentations', label: 'client_presentations' },
        { value: 'Design iterations', label: 'design_iterations' },
        { value: 'Marketing materials', label: 'marketing_materials' },
        {
          value: 'Internal team communication',
          label: 'internal_team_communication',
        },
      ],
    },
    {
      name: 'numOfVisualizationProjects',
      label: 'how_many_visualization_projects_have_you_worked_on',
      options: [
        { value: '1 - 3 projects', label: 'key_1_3_projects' },
        { value: '4 - 10 projects', label: 'key_4_10_projects' },
        { value: '10+ projects', label: 'key_10_projects' },
      ],
    },
    {
      name: 'architecturalStyle',
      label: 'what_architectural_styles_do_you_prefer',
      options: [
        { value: 'Modern/Contemporary', label: 'modern_contemporary' },
        { value: 'Traditional', label: 'traditional' },
        { value: 'Industrial', label: 'industrial' },
        { value: 'Minimalist', label: 'minimalist' },
        {
          value: 'Sustainable/Eco-friendly',
          label: 'sustainable_eco_friendly',
        },
        { value: 'Mixed-use', label: 'mixed_use' },
        { value: 'Historical/Conservation', label: 'historical_conservation' },
        { value: 'Others', label: 'others' },
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

export default Step2;

