import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { FormControl, FormLabel, FormErrorMessage, Radio, RadioGroup } from '@chakra-ui/react';
import { RootState } from '@/store';
import { useTranslation } from 'react-i18next';

const Step6: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data } = useSelector((state: RootState) => state.survey);

  const formConfig = [
    {
      name: 'f1',
      label: 'based_on_answers_we_can_provide',
      options: [
        { value: 'Customized tutorial paths', label: 'customized_tutorial_paths' },
        { value: 'Relevant case studies', label: 'relevant_case_studies' },
        { value: 'Recommended workflows', label: 'recommended_workflows' },
        { value: 'Feature recommendations', label: 'feature_recommendations' },
        { value: 'Template suggestions', label: 'template_suggestions' },
        { value: 'Style preferences', label: 'style_preferences' },
        { value: 'Collaboration settings', label: 'collaboration_settings' },
      ],
    },
    {
      name: 'f2',
      label: 'implementation_notes',
      options: [
        { value: 'Keep the flow dynamic', label: 'keep_the_flow_dynamic' },
        { value: 'Use visual aids where possible', label: 'use_visual_aids_where_possible' },
        { value: 'Include progress indicator', label: 'include_progress_indicator' },
        { value: 'Allow saving and returning later', label: 'allow_saving_and_returning_later' },
        { value: 'Provide “Skip for now” options', label: 'provide_skip_for_now_options' },
        { value: 'Offer help tooltips for technical term', label: 'offer_help_tooltips_for_technical_term' },
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

export default Step6;

