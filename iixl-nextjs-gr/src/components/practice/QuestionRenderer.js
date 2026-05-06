import { useEffect, useState } from 'react';
import { 
    DndContext, 
    PointerSensor, 
    TouchSensor, 
    useSensor, 
    useSensors, 
    rectIntersection,
    MeasuringStrategy
} from '@dnd-kit/core';

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
import FingerCountingLab from './FingerCountingLab';


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
    sequence: FillInTheBlankRenderer,
    arithmetic_journey: StepwiseArithmeticRenderer,
    journey_v1: JourneyRenderer,
    fingerMultiplication: FingerMultiplicationLab,
    fingerCounting: FingerCountingLab,
};




export default function QuestionRenderer({
    question,
    userAnswer,
    onAnswer,
    onSubmit,
    isAnswered,
    isCorrect
}) {
    const [selectedItem, setSelectedItem] = useState(null); // { id, value }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
    );

    const handleItemClick = (id, value) => {
        if (isAnswered) return;
        if (selectedItem?.id === id) {
            setSelectedItem(null); // Deselect
        } else {
            setSelectedItem({ id, value });
        }
    };

    const handleTargetClick = (targetId) => {
        if (isAnswered || !selectedItem) return;
        
        const blankId = String(targetId).replace('blank-', '');
        
        if (typeof userAnswer === 'object' && userAnswer !== null) {
            onAnswer({ ...userAnswer, [blankId]: selectedItem.value });
        } else {
            onAnswer({ [blankId]: selectedItem.value });
        }
        
        setSelectedItem(null); // Reset after placing
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || isAnswered) return;

        const itemId = active.id;
        const targetId = over.id;

        // If it's a fill-in-the-blank style interaction
        if (String(targetId).startsWith('blank-') || String(targetId).startsWith('digit_')) {
            const blankId = String(targetId).replace('blank-', '');
            const itemValue = active.data.current?.value || itemId;
            
            if (typeof userAnswer === 'object' && userAnswer !== null) {
                onAnswer({ ...userAnswer, [blankId]: itemValue });
            } else {
                onAnswer({ [blankId]: itemValue });
            }
        }
        setSelectedItem(null); // Clear selection on drag
    };

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
        <DndContext 
            sensors={sensors} 
            onDragEnd={handleDragEnd}
            collisionDetection={rectIntersection}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
            <Renderer
                question={question}
                userAnswer={userAnswer}
                onAnswer={onAnswer}
                onSubmit={onSubmit}
                isAnswered={isAnswered}
                isCorrect={isCorrect}
                selectedItem={selectedItem}
                onItemClick={handleItemClick}
                onTargetClick={handleTargetClick}
            />
        </DndContext>
    );
}
