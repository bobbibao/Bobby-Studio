import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { FormControl, FormLabel, FormErrorMessage, Radio, RadioGroup } from '@chakra-ui/react';
import { RootState } from '@/store';
import { useTranslation } from 'react-i18next';

const Step4: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data } = useSelector((state: RootState) => state.survey);

  const formConfig = [
    {
      name: 'f1',
      label: 'what_are_your_main_goals_with_bobby',
      options: [
        { value: 'Reduce visualization time', label: 'reduce_visualization_time' },
        { value: 'Improve client communication', label: 'improve_client_communication' },
        { value: 'Explore more design options', label: 'explore_more_design_options' },
        { value: 'Create better presentations', label: 'create_better_presentations' },
        { value: 'Reduce costs', label: 'reduce_costs' },
        { value: 'Stay competitive', label: 'stay_competitive' },
        { value: 'Enhance creativity', label: 'enhance_creativity' },
      ],
    },
    {
      name: 'f2',
      label: 'how_would_you_measure_success_with_our_tools',
      options: [
        { value: 'Time saved per project', label: 'time_saved_per_project' },
        { value: 'Client satisfaction', label: 'client_satisfaction' },
        { value: 'Number of concepts explored', label: 'number_of_concepts_explored' },
        { value: 'Team productivity', label: 'team_productivity' },
        { value: 'Cost reduction', label: 'cost_reduction' },
      ],
    },
    {
      name: 'f3',
      label: 'support_needs',
      options: [
        { value: 'Preferred way to learn new tools?', label: 'preferred_way_to_learn_new_tools' },
        { value: 'Video tutorials', label: 'video_tutorials' },
        { value: 'Written documentation', label: 'written_documentation' },
        { value: 'Live training sessions', label: 'live_training_sessions' },
        { value: 'Trial and error', label: 'trial_and_error' },
        { value: 'Community forums', label: 'community_forums' },
        { value: '1-on-1 support', label: 'key_1on1_support' },
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

export default Step4;

