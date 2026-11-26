import { queryParams, type RouteQueryOptions, type RouteDefinition, type RouteFormDefinition, applyUrlDefaults } from './../../../../wayfinder'
/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::analyze
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:24
 * @route '/admin/reports/{report}/ai/analyze'
 */
export const analyze = (args: { report: number | { id: number } } | [report: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: analyze.url(args, options),
    method: 'post',
})

analyze.definition = {
    methods: ["post"],
    url: '/admin/reports/{report}/ai/analyze',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::analyze
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:24
 * @route '/admin/reports/{report}/ai/analyze'
 */
analyze.url = (args: { report: number | { id: number } } | [report: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions) => {
    if (typeof args === 'string' || typeof args === 'number') {
        args = { report: args }
    }

            if (typeof args === 'object' && !Array.isArray(args) && 'id' in args) {
            args = { report: args.id }
        }
    
    if (Array.isArray(args)) {
        args = {
                    report: args[0],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        report: typeof args.report === 'object'
                ? args.report.id
                : args.report,
                }

    return analyze.definition.url
            .replace('{report}', parsedArgs.report.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::analyze
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:24
 * @route '/admin/reports/{report}/ai/analyze'
 */
analyze.post = (args: { report: number | { id: number } } | [report: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: analyze.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Admin\AdminAiReportController::analyze
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:24
 * @route '/admin/reports/{report}/ai/analyze'
 */
    const analyzeForm = (args: { report: number | { id: number } } | [report: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: analyze.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\AdminAiReportController::analyze
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:24
 * @route '/admin/reports/{report}/ai/analyze'
 */
        analyzeForm.post = (args: { report: number | { id: number } } | [report: number | { id: number } ] | number | { id: number }, options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: analyze.url(args, options),
            method: 'post',
        })
    
    analyze.form = analyzeForm
/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::review
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:35
 * @route '/admin/reports/{report}/ai/analyses/{analysis}/review'
 */
export const review = (args: { report: number | { id: number }, analysis: number | { id: number } } | [report: number | { id: number }, analysis: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: review.url(args, options),
    method: 'post',
})

review.definition = {
    methods: ["post"],
    url: '/admin/reports/{report}/ai/analyses/{analysis}/review',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::review
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:35
 * @route '/admin/reports/{report}/ai/analyses/{analysis}/review'
 */
review.url = (args: { report: number | { id: number }, analysis: number | { id: number } } | [report: number | { id: number }, analysis: number | { id: number } ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
                    report: args[0],
                    analysis: args[1],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        report: typeof args.report === 'object'
                ? args.report.id
                : args.report,
                                analysis: typeof args.analysis === 'object'
                ? args.analysis.id
                : args.analysis,
                }

    return review.definition.url
            .replace('{report}', parsedArgs.report.toString())
            .replace('{analysis}', parsedArgs.analysis.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::review
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:35
 * @route '/admin/reports/{report}/ai/analyses/{analysis}/review'
 */
review.post = (args: { report: number | { id: number }, analysis: number | { id: number } } | [report: number | { id: number }, analysis: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: review.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Admin\AdminAiReportController::review
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:35
 * @route '/admin/reports/{report}/ai/analyses/{analysis}/review'
 */
    const reviewForm = (args: { report: number | { id: number }, analysis: number | { id: number } } | [report: number | { id: number }, analysis: number | { id: number } ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: review.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\AdminAiReportController::review
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:35
 * @route '/admin/reports/{report}/ai/analyses/{analysis}/review'
 */
        reviewForm.post = (args: { report: number | { id: number }, analysis: number | { id: number } } | [report: number | { id: number }, analysis: number | { id: number } ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: review.url(args, options),
            method: 'post',
        })
    
    review.form = reviewForm
/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::duplicateDecision
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:85
 * @route '/admin/reports/{report}/ai/duplicates/{candidate}/decision'
 */
export const duplicateDecision = (args: { report: number | { id: number }, candidate: number | { id: number } } | [report: number | { id: number }, candidate: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: duplicateDecision.url(args, options),
    method: 'post',
})

duplicateDecision.definition = {
    methods: ["post"],
    url: '/admin/reports/{report}/ai/duplicates/{candidate}/decision',
} satisfies RouteDefinition<["post"]>

/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::duplicateDecision
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:85
 * @route '/admin/reports/{report}/ai/duplicates/{candidate}/decision'
 */
duplicateDecision.url = (args: { report: number | { id: number }, candidate: number | { id: number } } | [report: number | { id: number }, candidate: number | { id: number } ], options?: RouteQueryOptions) => {
    if (Array.isArray(args)) {
        args = {
                    report: args[0],
                    candidate: args[1],
                }
    }

    args = applyUrlDefaults(args)

    const parsedArgs = {
                        report: typeof args.report === 'object'
                ? args.report.id
                : args.report,
                                candidate: typeof args.candidate === 'object'
                ? args.candidate.id
                : args.candidate,
                }

    return duplicateDecision.definition.url
            .replace('{report}', parsedArgs.report.toString())
            .replace('{candidate}', parsedArgs.candidate.toString())
            .replace(/\/+$/, '') + queryParams(options)
}

/**
* @see \App\Http\Controllers\Admin\AdminAiReportController::duplicateDecision
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:85
 * @route '/admin/reports/{report}/ai/duplicates/{candidate}/decision'
 */
duplicateDecision.post = (args: { report: number | { id: number }, candidate: number | { id: number } } | [report: number | { id: number }, candidate: number | { id: number } ], options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: duplicateDecision.url(args, options),
    method: 'post',
})

    /**
* @see \App\Http\Controllers\Admin\AdminAiReportController::duplicateDecision
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:85
 * @route '/admin/reports/{report}/ai/duplicates/{candidate}/decision'
 */
    const duplicateDecisionForm = (args: { report: number | { id: number }, candidate: number | { id: number } } | [report: number | { id: number }, candidate: number | { id: number } ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
        action: duplicateDecision.url(args, options),
        method: 'post',
    })

            /**
* @see \App\Http\Controllers\Admin\AdminAiReportController::duplicateDecision
 * @see app/Http/Controllers/Admin/AdminAiReportController.php:85
 * @route '/admin/reports/{report}/ai/duplicates/{candidate}/decision'
 */
        duplicateDecisionForm.post = (args: { report: number | { id: number }, candidate: number | { id: number } } | [report: number | { id: number }, candidate: number | { id: number } ], options?: RouteQueryOptions): RouteFormDefinition<'post'> => ({
            action: duplicateDecision.url(args, options),
            method: 'post',
        })
    
    duplicateDecision.form = duplicateDecisionForm
const ai = {
    analyze: Object.assign(analyze, analyze),
review: Object.assign(review, review),
duplicateDecision: Object.assign(duplicateDecision, duplicateDecision),
}

export default ai