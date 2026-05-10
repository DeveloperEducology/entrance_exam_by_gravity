import { NextResponse } from 'next/server';
import { generateFractionsV2Question, getFractionsV2TemplateConfig } from '@/lib/practice/generators/math/fractions-v2';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const logicType = searchParams.get('logic_type') || 'visual_models_identify';
    const seed = searchParams.get('seed') || Date.now().toString();

    const template = getFractionsV2TemplateConfig(logicType);

    // Call the V2 generator orchestrator
    const question = generateFractionsV2Question({
      logic_type: logicType,
      variables: {
        seed
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Fractions V2 Generator working correctly',
      logicType,
      seed,
      template,
      question
    });
  } catch (error) {
    console.error('Test generator error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
