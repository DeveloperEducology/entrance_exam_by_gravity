'use client';

import { useEffect } from 'react';

import MCQRenderer from './MCQRenderer';
import ImageChoiceRenderer from './ImageChoiceRenderer';
import TextInputRenderer from './TextInputRenderer';
import FillInTheBlankRenderer from './FillInTheBlankRenderer';
import DragDropRenderer from './DragDropRenderer';
import SortingRenderer from './SortingRenderer';
import FourPicsRenderer from './FourPicsRenderer';
import MeasureRenderer from './MeasureRenderer';
import ShadeGridRenderer from './ShadeGridRenderer';
import TokenSelectionRenderer from './TokenSelectionRenderer';
import TokenSelectionRendererV2 from './TokenSelectionRendererV2';
import DragDropRendererV2 from './DragDropRendererV2';
import GuidedStepRenderer from './GuidedStepRenderer';
import LongDivisionStepRenderer from './LongDivisionStepRenderer';
import StepwiseArithmeticRenderer from './StepwiseArithmeticRenderer';
import JourneyRenderer from './JourneyRenderer';
import DotGridRenderer from './DotGridRenderer';
import DragDropRendererV3 from './DragDropRendererV3';
import FingerMultiplicationLab from './FingerMultiplicationLab';


const RENDERER_MAP = {
    mcq: MCQRenderer,
    imageChoice: ImageChoiceRenderer,
    textInput: TextInputRenderer,
    fillInTheBlank: FillInTheBlankRenderer,
    gridArithmetic: FillInTheBlankRenderer,
    draganddrop: DragDropRenderer,
    draganddropv2: DragDropRendererV2,
    draganddropv3: DragDropRendererV3,
    sorting: SortingRenderer,
    fourPicsOneWord: FourPicsRenderer,
    measure: MeasureRenderer,
    shadeGrid: ShadeGridRenderer,
    dotGrid: DotGridRenderer,
    tokenSelection: TokenSelectionRenderer,
    tokenselection: TokenSelectionRenderer,
    tokenSelectionV2: TokenSelectionRendererV2,
    tokenselectionv2: TokenSelectionRendererV2,
    stepwise: (props) => {
        if (props.question?.ui_config?.type === 'ladder_focus') {
            return <LongDivisionStepRenderer {...props} />;
        }
        return <GuidedStepRenderer {...props} />;
    },
    table: FillInTheBlankRenderer,
    smartTable: FillInTheBlankRenderer,
    arithmetic_journey: StepwiseArithmeticRenderer,
    journey_v1: JourneyRenderer,
    fingerMultiplication: FingerMultiplicationLab,
};


export default function QuestionRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered,
    isCorrect
}) {
    const normalizedType = String(question.type || '').trim();
    const rendererKey = normalizedType in RENDERER_MAP
        ? normalizedType
        : normalizedType.toLowerCase();
    const Renderer = RENDERER_MAP[rendererKey];

    useEffect(() => {
        if (question) {
            console.log("DEBUG: Current Question Data", {
                id: question.id,
                type: question.type,
                correctAnswerText: question.correctAnswerText,
                correctAnswerIndex: question.correctAnswerIndex,
                validation: question.validation
            });
        }
    }, [question?.id]);

    if (!Renderer) {
        return <div>Unsupported question type: {normalizedType || 'unknown'}</div>;
    }

    return (
        <Renderer
            question={question}
            userAnswer={userAnswer}
            onAnswer={onAnswer}
            onSubmit={onSubmit}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
        />
    );
}
