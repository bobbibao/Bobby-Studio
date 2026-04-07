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


const Step1: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data } = useSelector((state: RootState) => state.survey);

  const formConfig = [
    {
      name: 'role',
      label: 'what_best_describes_your_role',
      options: [
        { value: 'Architect', label: 'architect' },
        { value: 'Interior Designer', label: 'interior_designer' },
        { value: 'Project Manager', label: 'project_manager' },
        { value: 'Design Student', label: 'design_student' },
        { value: 'Others', label: 'others' },
      ],
    },
    {
      name: 'experience',
      label: 'years_of_experience_in_your_field',
      options: [
        { value: '0 - 2 years (Junior)', label: 'key_0_2_years_junior' },
        { value: '3 - 5 years (Mid-level)', label: 'key_3_5_years_midlevel' },
        { value: '6 - 10 years (Senior)', label: 'key_6_10_years_senior' },
        { value: '10+ years (Expert)', label: 'key_10_years_expert' },
      ],
    },
    {
      name: 'tools',
      label: 'what_tools_do_you_currently_use_for_visualization',
      options: [
        { value: 'Archicad', label: 'archicad' },
        { value: 'SketchUp', label: 'sketchup' },
        { value: 'AutoCAD', label: 'autocad' },
        { value: 'Revit', label: 'revit' },
        { value: '3ds Max', label: 'key_3ds_max' },
        { value: 'Hand sketching', label: 'hand_sketching' },
        {
          value: 'Outsource to other companies',
          label: 'outsource_to_other_companies',
        },
        { value: 'Others', label: 'others' },
      ],
    },
    {
      name: 'time',
      label: 'how_much_time_do_you_typically_spend_on_concept_visualization_per_project',
      options: [
        { value: 'Less than 2 hours', label: 'less_than_2_hours' },
        { value: '2 - 5 hours', label: 'key_2_5_hours' },
        { value: '5 - 10 hours', label: 'key_5_10_hours' },
        { value: '10+ hours', label: 'key_10_hours' },
      ],
    },
  ];

  return (
    <div>
      {formConfig.map((field: any) => (
        <FormControl
          key={field.name}
          isInvalid={!!errors[field.name]}
          className={'mt-10'}
        >
          <FormLabel>{t('profile:' + field.label)}</FormLabel>
          <RadioGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field.options.map((option: any) => (
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

export default Step1;

