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
import DragDropRendererV2 from './DragDropRendererV2';

const RENDERER_MAP = {
    mcq: MCQRenderer,
    imageChoice: ImageChoiceRenderer,
    textInput: TextInputRenderer,
    fillInTheBlank: FillInTheBlankRenderer,
    gridArithmetic: FillInTheBlankRenderer,
    dragAndDrop: DragDropRenderer,
    dragAndDropv2: DragDropRendererV2,
    sorting: SortingRenderer,
    fourPicsOneWord: FourPicsRenderer,
    measure: MeasureRenderer,
    shadeGrid: ShadeGridRenderer,
    tokenSelection: TokenSelectionRenderer,
    table: FillInTheBlankRenderer,
    smartTable: FillInTheBlankRenderer,
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
