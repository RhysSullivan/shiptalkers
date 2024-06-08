export type Props = {
    searchParams:
    | {
        github: string;
        twitter: string;
    }
    | {
        name: string;
    };
};

export function parse(props: Props) {
    return "name" in props.searchParams
        ? {
            github: props.searchParams.name.toLowerCase(),
            twitter: props.searchParams.name.toLowerCase(),
        }
        : {
            github: props.searchParams.github.toLowerCase(),
            twitter: props.searchParams.twitter.toLowerCase(),
        };
}
